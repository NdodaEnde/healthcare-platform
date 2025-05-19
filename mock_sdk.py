"""
Mock implementation of the agentic_doc SDK
Used as a fallback when the real SDK is not available

This mock implementation tries to match the behavior and interface of the real SDK
as closely as possible, including support for chunk types and the same return formats.
"""

import fitz  # PyMuPDF
import os
import uuid
import json
import time
import enum
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Tuple
import random

# Mock implementation of ChunkType from agentic_doc.common
class ChunkType(str, enum.Enum):
    """Mock implementation of ChunkType from the SDK"""
    PRETTY = "pretty"
    RAW = "raw"
    error = "error"  # For compatibility with real SDK

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
    Implements optional parameters like chunk_types for compatibility with the real SDK.
    
    Args:
        file_paths: List of paths to PDF files
        **kwargs: Additional arguments to pass to the SDK, including:
            - chunk_types: List of chunk types to extract (e.g., [ChunkType.PRETTY])
            - chunk_titles: List of titles for each document (preserves original filenames)
        
    Returns:
        Dict mapping file paths to pages and chunks
    """
    # Process optional parameters
    chunk_titles = kwargs.get('chunk_titles', [])
    
    result = {}
    
    for i, file_path in enumerate(file_paths):
        if not os.path.exists(file_path):
            continue
        
        # Check if file is a PDF
        if not file_path.lower().endswith('.pdf'):
            continue
        
        # Add some delay to simulate processing time (longer for bigger PDFs)
        file_size_mb = os.path.getsize(file_path) / (1024 * 1024)
        delay = min(3, max(0.5, file_size_mb / 10))  # 0.5-3 seconds based on file size
        time.sleep(delay)
        
        # Extract text with coordinates
        text_data = extract_text_with_coordinates(file_path)
        
        # Use original filename if provided through chunk_titles
        original_filename = chunk_titles[i] if i < len(chunk_titles) else os.path.basename(file_path)
        
        # Group by page
        pages_data = {}
        for text, box in text_data:
            page_num = box.page
            
            if page_num not in pages_data:
                pages_data[page_num] = []
            
            # Create chunk with the same structure as in sdk_2_app.py
            # This ensures compatibility with the highlighting logic
            chunk = {
                "text": text,
                "bbox": box.to_dict(),
                "chunk_id": str(uuid.uuid4()),
                # Add random score for simulation
                "relevance_score": random.uniform(0.5, 1.0),
                # Add original filename for better identification
                "filename": original_filename
            }
            
            pages_data[page_num].append(chunk)
        
        # Store in result dict
        if pages_data:
            result[file_path] = pages_data
    
    print(f"Mock SDK processed {len(result)} documents with {sum(len(pages) for pages in result.values())} pages")
    return result

def get_answer_and_best_chunks(question: str, evidence: Dict[str, Any]) -> Dict[str, Any]:
    """
    Mock implementation of question answering function
    Matches the format used in sdk_2_app.py get_answer_and_best_chunks function
    
    Args:
        question: The question to answer
        evidence: Document evidence from parse_documents or from frontend
        
    Returns:
        Dict with answer, reasoning and supporting chunks in the same format as sdk_2_app.py
    """
    # Check if the evidence is in the process-documents endpoint format or the frontend format
    if isinstance(next(iter(evidence.values() or [{}]), {}), dict) and isinstance(next(iter(next(iter(evidence.values() or [{}]), {}).values() or [{}]), {}), list):
        # It's in the process-documents endpoint format (file_path -> pages -> chunks)
        all_chunks = []
        for file_path, pages in evidence.items():
            filename = os.path.basename(file_path)
            for page_num, chunks in pages.items():
                for chunk in chunks:
                    # Convert to the expected best_chunks format
                    all_chunks.append({
                        "file": filename,
                        "page": int(page_num) if str(page_num).isdigit() else 1,
                        "bboxes": [
                            [
                                chunk["bbox"]["left"], 
                                chunk["bbox"]["top"], 
                                chunk["bbox"]["right"] - chunk["bbox"]["left"], 
                                chunk["bbox"]["bottom"] - chunk["bbox"]["top"]
                            ]
                        ],
                        "captions": [chunk["text"]],
                        "reason": f"This text is relevant to the question: {question}",
                        "score": chunk.get("relevance_score", random.uniform(0.5, 1.0))
                    })
    else:
        # It might be in the frontend format (filename:page -> chunks)
        all_chunks = []
        for key, chunks_list in evidence.items():
            try:
                filename, page = key.split(":")
                page_num = int(page) if str(page).isdigit() else 1
                
                for chunk in chunks_list:
                    # Get bounding box info
                    bbox = chunk.get("bbox", {})
                    if isinstance(bbox, dict):
                        # Format: {"left": x, "top": y, "right": x2, "bottom": y2}
                        left = bbox.get("left", 0)
                        top = bbox.get("top", 0)
                        width = bbox.get("right", 1) - left
                        height = bbox.get("bottom", 1) - top
                    elif isinstance(bbox, (list, tuple)) and len(bbox) == 4:
                        # Format: [left, top, right, bottom]
                        left, top, right, bottom = bbox
                        width = right - left
                        height = bottom - top
                    else:
                        left, top, width, height = 0, 0, 0.1, 0.1
                    
                    all_chunks.append({
                        "file": filename,
                        "page": page_num,
                        "bboxes": [[left, top, width, height]],
                        "captions": [chunk.get("text", "")],
                        "reason": f"This text is relevant to the question: {question}",
                        "score": chunk.get("relevance_score", random.uniform(0.5, 1.0))
                    })
            except (ValueError, KeyError):
                continue
    
    # Sort by random score to simulate relevance
    all_chunks.sort(key=lambda x: x["score"], reverse=True)
    
    # Take top 3 chunks as "best evidence"
    best_chunks = all_chunks[:3] if len(all_chunks) >= 3 else all_chunks
    
    # Create mock answer in the format used by sdk_2_app.py
    return {
        "answer": f"This is a simulated answer to the question: {question}",
        "reasoning": "This mock implementation provides simulated answers. In a real implementation, this would contain step-by-step reasoning based on the evidence.",
        "best_chunks": best_chunks
    }