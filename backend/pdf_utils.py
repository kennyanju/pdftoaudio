import fitz  # PyMuPDF
import re
from typing import List

def extract_text_from_pdf(pdf_path: str) -> str:
    """Extracts text from a PDF file using PyMuPDF."""
    doc = fitz.open(pdf_path)
    text = ""
    for page in doc:
        # Using "blocks" helps with multi-column layouts
        blocks = page.get_text("blocks")
        # Sort blocks by vertical then horizontal position
        blocks.sort(key=lambda b: (b[1], b[0]))
        for b in blocks:
            # block[4] is the text content
            text += b[4] + "\n"
    
    # Basic cleaning
    text = clean_text(text)
    return text

def clean_text(text: str) -> str:
    """Basic text cleaning to remove repetitive headers/footers and extra whitespace."""
    # Remove extra whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    # You could add more sophisticated cleaning here if needed
    return text

def chunk_text(text: str, max_chars: int = 4000) -> List[str]:
    """Splits text into chunks at sentence boundaries."""
    if not text:
        return []

    # Split into sentences (approximate using common punctuation)
    sentences = re.split(r'(?<=[.!?]) +', text)
    
    chunks = []
    current_chunk = ""
    
    for sentence in sentences:
        if len(current_chunk) + len(sentence) + 1 <= max_chars:
            if current_chunk:
                current_chunk += " " + sentence
            else:
                current_chunk = sentence
        else:
            if current_chunk:
                chunks.append(current_chunk)
            
            # If a single sentence is longer than max_chars, we have to split it mapping the char limit
            if len(sentence) > max_chars:
                # Fallback: split by max_chars
                for i in range(0, len(sentence), max_chars):
                    chunks.append(sentence[i:i + max_chars])
                current_chunk = ""
            else:
                current_chunk = sentence
    
    if current_chunk:
        chunks.append(current_chunk)
        
    return chunks
