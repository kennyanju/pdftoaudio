import httpx
import base64
import os
import ffmpeg
import logging
from typing import List

logger = logging.getLogger(__name__)

async def generate_audio_chunk(
    text: str, 
    api_key: str, 
    model: str = "openai/gpt-4o-audio-preview", 
    voice: str = "alloy"
) -> bytes:
    """Sends a text chunk to OpenRouter and returns the audio bytes."""
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/kennyanju/pdftoaudio",
        "X-Title": "PDF to Audio Converter"
    }
    
    payload = {
        "model": model,
        "modalities": ["text", "audio"],
        "audio": { "voice": voice, "format": "mp3" },
        "messages": [
            { "role": "user", "content": f"Read the following text clearly: {text}" }
        ]
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=headers, json=payload, timeout=120.0)
        response.raise_for_status()
        data = response.json()
        
        # Extract audio data
        try:
            audio_base64 = data['choices'][0]['message']['audio']['data']
            return base64.b64decode(audio_base64)
        except (KeyError, IndexError) as e:
            logger.error(f"Failed to extract audio from response: {e}. Response: {data}")
            raise Exception("API response did not contain audio data.")

def merge_audio_chunks(chunk_paths: List[str], output_path: str):
    """Merges multiple MP3 files into one using FFmpeg."""
    if not chunk_paths:
        return
    
    # Create a temporary file for the concat demuxer
    list_file = "concat_list.txt"
    with open(list_file, "w") as f:
        for path in chunk_paths:
            # Use absolute path and escape single quotes for ffmpeg
            abs_path = os.path.abspath(path)
            f.write(f"file '{abs_path}'\n")
            
    try:
        (
            ffmpeg
            .input(list_file, format='concat', safe=0)
            .output(output_path, c='copy')
            .overwrite_output()
            .run(capture_stdout=True, capture_stderr=True)
        )
    except ffmpeg.Error as e:
        logger.error(f"FFmpeg error: {e.stderr.decode()}")
        raise
    finally:
        if os.path.exists(list_file):
            os.remove(list_file)
