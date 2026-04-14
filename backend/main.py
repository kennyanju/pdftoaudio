import os
import shutil
import uuid
import asyncio
from fastapi import FastAPI, UploadFile, File, BackgroundTasks, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import logging

from . import pdf_utils, audio_utils, database
from .database import Job, get_db

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="PDF to Audio Converter")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this to your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
PROCESSED_DIR = "processed"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(PROCESSED_DIR, exist_ok=True)

API_KEY = os.getenv("OPENROUTER_API_KEY")

@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    
    job_id = str(uuid.uuid4())
    file_path = os.path.join(UPLOAD_DIR, f"{job_id}.pdf")
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    try:
        text = pdf_utils.extract_text_from_pdf(file_path)
        chunks = pdf_utils.chunk_text(text)
        
        job = Job(
            id=job_id,
            filename=file.filename,
            status="Uploaded",
            text_length=len(text),
            num_chunks=len(chunks)
        )
        db.add(job)
        db.commit()
        db.refresh(job)
        
        return {
            "job_id": job_id,
            "filename": file.filename,
            "text_preview": text[:1000] + ("..." if len(text) > 1000 else ""),
            "num_chunks": len(chunks)
        }
    except Exception as e:
        logger.error(f"Error processing PDF: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/convert/{job_id}")
async def start_conversion(job_id: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if not API_KEY:
        raise HTTPException(status_code=400, detail="OpenRouter API Key not configured on server.")

    job.status = "Processing"
    db.commit()
    
    background_tasks.add_task(process_conversion, job_id, API_KEY)
    
    return {"message": "Conversion started", "job_id": job_id}

@app.get("/status/{job_id}")
async def get_status(job_id: str, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

@app.get("/history")
async def get_history(db: Session = Depends(get_db)):
    return db.query(Job).order_by(Job.created_at.desc()).all()

@app.get("/download/{job_id}")
async def download_audio(job_id: str, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job or not job.output_file:
        raise HTTPException(status_code=404, detail="Audio file not found")
    return FileResponse(job.output_file, media_type="audio/mpeg", filename=f"{job.filename}.mp3")

async def process_conversion(job_id: str, api_key: str):
    # This function runs in the background
    db_session = database.SessionLocal()
    try:
        job = db_session.query(Job).filter(Job.id == job_id).first()
        file_path = os.path.join(UPLOAD_DIR, f"{job_id}.pdf")
        
        text = pdf_utils.extract_text_from_pdf(file_path)
        chunks = pdf_utils.chunk_text(text)
        
        temp_chunks = []
        for i, chunk in enumerate(chunks):
            # Update status with progress
            job.status = f"Processing chunk {i+1}/{len(chunks)}"
            db_session.commit()
            
            audio_bytes = await audio_utils.generate_audio_chunk(chunk, api_key)
            chunk_path = os.path.join(UPLOAD_DIR, f"{job_id}_chunk_{i}.mp3")
            with open(chunk_path, "wb") as f:
                f.write(audio_bytes)
            temp_chunks.append(chunk_path)
        
        job.status = "Merging chunks"
        db_session.commit()
        
        final_output = os.path.join(PROCESSED_DIR, f"{job_id}.mp3")
        audio_utils.merge_audio_chunks(temp_chunks, final_output)
        
        job.status = "Completed"
        job.output_file = final_output
        db_session.commit()
        
        # Cleanup temp chunks
        for path in temp_chunks:
            if os.path.exists(path):
                os.remove(path)
                
    except Exception as e:
        logger.error(f"Error in background conversion for job {job_id}: {e}")
        job = db_session.query(Job).filter(Job.id == job_id).first()
        if job:
            job.status = f"Failed: {str(e)}"
            db_session.commit()
    finally:
        db_session.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
