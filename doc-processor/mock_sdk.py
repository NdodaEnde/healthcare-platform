"""
Mock implementation of the agentic_doc SDK
Used as a fallback when the real SDK is not available
"""

import fitz  # PyMuPDF
import os
import uuid
import json
import time
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Tuple
import random

@dataclass
class Box:
    """Representation of a bounding box in a document"""
    left: float
    top: float
    right: float
    bottom: float
    page: int
    
    def to_dict(self):
        return {
            "left": self.left,
            "top": self.top,
            "right": self.right,
            "bottom": self.bottom,
            "page": self.page
        }

@dataclass
class Grounding:
    """Information about where a chunk comes from"""
    file_path: str
    box: Box
    
    def to_dict(self):
        return {
            "file_path": self.file_path,
            "box": self.box.to_dict() if self.box else None
        }

@dataclass
class Chunk:
    """A piece of text from a document with its location"""
    text: str
    grounding: Grounding
    chunk_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    
    def to_dict(self):
        return {
            "text": self.text,
            "grounding": self.grounding.to_dict(),
            "chunk_id": self.chunk_id
        }

@dataclass
class ParsedDocument:
    """A document that has been parsed into chunks"""
    chunks: List[Chunk]
    file_path: str
    
    def to_dict(self):
        return {
            "chunks": [chunk.to_dict() for chunk in self.chunks],
            "file_path": self.file_path
        }

def extract_text_with_coordinates(pdf_path: str) -> List[Tuple[str, Box]]:
    """
    Extract text from PDF with bounding box coordinates.
    Returns list of (text, box) tuples.
    """
    result = []
    doc = fitz.open(pdf_path)
    
    for page_num, page in enumerate(doc):
        blocks = page.get_text("dict")["blocks"]
        
        for block in blocks:
            if "lines" in block:
                for line in block["lines"]:
                    for span in line["spans"]:
                        text = span["text"].strip()
                        if text:
                            bbox = span["bbox"]
                            # Normalize coordinates to 0-1 range
                            page_width, page_height = page.rect.width, page.rect.height
                            box = Box(
                                left=bbox[0] / page_width,
                                top=bbox[1] / page_height,
                                right=bbox[2] / page_width,
                                bottom=bbox[3] / page_height,
                                page=page_num
                            )
                            result.append((text, box))
    
    doc.close()
    return result

def parse_documents(file_paths: List[str], **kwargs) -> Dict[str, Dict[int, List[Dict[str, Any]]]]:
    """
    Mock implementation of the parse_documents function from the agentic_doc SDK.
    
    Args:
        file_paths: List of paths to PDF files
        **kwargs: Additional arguments to pass to the SDK
        
    Returns:
        Dict mapping file paths to pages and chunks
    """
    result = {}
    
    for file_path in file_paths:
        if not os.path.exists(file_path):
            continue
        
        # Check if file is a PDF
        if not file_path.lower().endswith('.pdf'):
            continue
        
        # Add some delay to simulate processing time
        time.sleep(0.5)
        
        # Extract text with coordinates
        text_data = extract_text_with_coordinates(file_path)
        
        # Group by page
        pages_data = {}
        for text, box in text_data:
            page_num = box.page
            
            if page_num not in pages_data:
                pages_data[page_num] = []
            
            # Create chunk
            chunk = {
                "text": text,
                "bbox": box.to_dict(),
                "chunk_id": str(uuid.uuid4()),
                # Add random score for simulation
                "relevance_score": random.uniform(0.5, 1.0)
            }
            
            pages_data[page_num].append(chunk)
        
        # Store in result dict
        if pages_data:
            result[file_path] = pages_data
    
    return result

def get_answer_and_best_chunks(question: str, evidence: Dict[str, Dict[int, List[Dict[str, Any]]]]) -> Dict[str, Any]:
    """
    Mock implementation of question answering function
    
    Args:
        question: The question to answer
        evidence: Document evidence from parse_documents
        
    Returns:
        Dict with answer, reasoning and supporting chunks
    """
    # Collect all chunks from all documents
    all_chunks = []
    for file_path, pages in evidence.items():
        for page_num, chunks in pages.items():
            for chunk in chunks:
                all_chunks.append({
                    "text": chunk["text"],
                    "file_path": file_path,
                    "page": page_num,
                    "bbox": chunk["bbox"],
                    "chunk_id": chunk["chunk_id"],
                    "score": chunk.get("relevance_score", random.uniform(0.5, 1.0))
                })
    
    # Sort by random score to simulate relevance
    all_chunks.sort(key=lambda x: x["score"], reverse=True)
    
    # Take top 3 chunks as "best evidence"
    best_chunks = all_chunks[:3] if len(all_chunks) >= 3 else all_chunks
    
    # Create mock answer
    return {
        "answer": f"This is a simulated answer to the question: {question}",
        "reasoning": "This is where the reasoning would go in a real implementation.",
        "best_chunks": best_chunks
    }