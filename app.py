from flask import Flask, request, jsonify
import os
import tempfile
import uuid
import json
import time
from flask_cors import CORS
from dotenv import load_dotenv
import numpy as np
from PIL import Image

# Load environment variables from .env file
load_dotenv()

# Set SDK environment variables BEFORE importing the SDK
os.environ["BATCH_SIZE"] = os.getenv("BATCH_SIZE", "20")
os.environ["MAX_WORKERS"] = os.getenv("MAX_WORKERS", "5")
os.environ["MAX_RETRIES"] = os.getenv("MAX_RETRIES", "100")
os.environ["RETRY_LOGGING_STYLE"] = os.getenv("RETRY_LOGGING_STYLE", "inline_block")

# Check for API keys
api_key = os.getenv("VISION_AGENT_API_KEY")
openai_api_key = os.getenv("OPENAI_API_KEY")

if not api_key:
    print("Warning: VISION_AGENT_API_KEY not set in .env")

if not openai_api_key:
    print("Warning: OPENAI_API_KEY not set in .env")

# Flag to track if the SDK has authorization/connection issues
sdk_auth_error = False

try:
    # Import the agentic-doc SDK - exactly like your working version
    from agentic_doc.parse import parse_documents
    from agentic_doc.common import ChunkType
    
    # Print success message
    print("Successfully imported agentic_doc SDK")
    USE_MOCK = False
except Exception as import_error:
    print(f"Warning: Failed to import agentic_doc SDK: {import_error}")
    print("Using mock implementation instead...")
    USE_MOCK = True
    # Import mock implementation
    try:
        from mock_sdk import parse_documents, ChunkType
        print("Successfully imported mock_sdk")
    except Exception as mock_error:
        print(f"Error importing mock_sdk: {mock_error}")
        raise

# Import OpenAI for Q&A functionality
from openai import OpenAI

# Print configuration
print(f"Document Processing Configuration:")
print(f"  BATCH_SIZE: {os.environ['BATCH_SIZE']}")
print(f"  MAX_WORKERS: {os.environ['MAX_WORKERS']}")
print(f"  MAX_RETRIES: {os.environ['MAX_RETRIES']}")
print(f"  RETRY_LOGGING_STYLE: {os.environ.get('RETRY_LOGGING_STYLE', 'default')}")
print(f"  OPENAI_MODEL: {'gpt-4o' if openai_api_key else 'not available'}")
print(f"  SDK MODE: {'REAL' if not USE_MOCK else 'MOCK'}")

app = Flask(__name__)
# Enable CORS for all routes with additional options
CORS(app, resources={r"/*": {"origins": "*", "allow_headers": ["Content-Type"]}})

# Configuration
UPLOAD_FOLDER = os.path.join(tempfile.gettempdir(), 'doc_processor_uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload size

# Storage for processed documents
processed_docs = {}

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy", 
        "service": "document-processor",
        "sdk": "mock" if USE_MOCK else "real",
        "api_key_available": bool(api_key),
        "sdk_auth_error": sdk_auth_error
    })

@app.route('/process-documents', methods=['POST'])
def process_documents():
    """Process uploaded documents using the agentic-doc SDK - identical to working implementation"""
    global sdk_auth_error
    
    if 'files' not in request.files:
        return jsonify({"error": "No files part in the request"}), 400
    
    files = request.files.getlist('files')
    if not files or files[0].filename == '':
        return jsonify({"error": "No files selected"}), 400
    
    temp_paths = []
    temp_filenames = []
    batch_id = str(uuid.uuid4())
    
    try:
        # Save uploaded files to temporary location
        for pdf_file in files:
            original_filename = pdf_file.filename
            temp_filenames.append(original_filename)
            
            with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
                pdf_file.save(tmp.name)
                temp_paths.append(tmp.name)
        
        start_time = time.time()
        print(f"Processing {len(temp_paths)} documents...")
        
        # Process PDFs with the actual agentic-doc SDK - exactly like working version
        all_evidence = {}
        
        try:
            # Use the SDK to parse documents
            parse_results = parse_documents(temp_paths)
            
            # Check if parse_results is None or empty, which might indicate an error
            if not parse_results or len(parse_results) == 0:
                processing_success = False
                processing_error = "No results returned from document parser - API may have failed"
                sdk_auth_error = True
            else:
                processing_success = True
                processing_error = None
                
                # Map results to the format expected by the frontend - exactly like working version
                for i, parsed_doc in enumerate(parse_results):
                    filename = temp_filenames[i]
                    page_map = {}
                    
                    # Check if chunks are empty or have errors
                    has_valid_chunks = False
                    for chunk in parsed_doc.chunks:
                        if chunk.chunk_type != ChunkType.error:
                            has_valid_chunks = True
                            break
                    
                    if not has_valid_chunks:
                        # Document likely failed processing but didn't raise an exception
                        processing_success = False
                        processing_error = "Document processing completed but no valid chunks were extracted - API may have failed"
                        sdk_auth_error = True
                        break
                    
                    for chunk in parsed_doc.chunks:
                        if chunk.chunk_type == ChunkType.error:
                            continue
                        
                        for grounding in chunk.grounding:
                            page_idx = grounding.page + 1  # Convert to 1-based
                            
                            if page_idx not in page_map:
                                page_map[page_idx] = []
                            
                            box = grounding.box
                            x1, y1 = box.l, box.t
                            w, h = box.r - box.l, box.b - box.t
                            
                            page_map[page_idx].append({
                                "bboxes": [[x1, y1, w, h]],
                                "captions": [chunk.text]
                            })
                    
                    # Store in the evidence structure
                    for page_num, chunk_list in page_map.items():
                        composite_key = f"{filename}:{page_num}"
                        all_evidence[composite_key] = chunk_list
                
                # If no evidence was extracted, consider it a failure
                if not all_evidence:
                    processing_success = False
                    processing_error = "No text or evidence could be extracted from the document - API may have failed"
                    sdk_auth_error = True
                
        except Exception as e:
            processing_success = False
            processing_error = str(e)
            
            # Check for auth-related errors
            if '401' in str(e) or 'Unauthorized' in str(e):
                sdk_auth_error = True
                processing_error = "Authentication failed (401 Unauthorized). Please check your VISION_AGENT_API_KEY."
            
            # Check for server errors
            elif '500' in str(e) or 'Internal Server Error' in str(e):
                sdk_auth_error = True
                processing_error = "Server error (500). The document processing service is experiencing issues."
                
            print(f"Error processing documents: {e}")
            import traceback
            traceback.print_exc()
        
        processing_time = time.time() - start_time
        print(f"Processing completed in {processing_time:.2f} seconds")
        
        # Store the processing details in our in-memory storage
        processed_docs[batch_id] = {
            "evidence": all_evidence,
            "files": temp_paths,
            "filenames": temp_filenames,
            "processed_at": time.time(),
            "processing_success": processing_success,
            "processing_error": processing_error,
            "sdk_auth_error": sdk_auth_error
        }
        
        # If using mock and SDK has auth errors, let's fall back to mock data for demo
        if USE_MOCK and sdk_auth_error:
            print("Using mock data for demo since SDK has authentication issues")
            # Generate some mock evidence for demo purposes
            mock_evidence = {}
            for i, filename in enumerate(temp_filenames):
                for page in range(1, 3):  # Generate 2 pages of mock data
                    composite_key = f"{filename}:{page}"
                    mock_evidence[composite_key] = [
                        {
                            "bboxes": [[0.1, 0.1, 0.8, 0.05]],
                            "captions": [f"Mock extracted text from page {page} - line 1"]
                        },
                        {
                            "bboxes": [[0.1, 0.2, 0.8, 0.05]],
                            "captions": [f"Mock extracted text from page {page} - line 2"]
                        }
                    ]
            
            # Update with mock data for demo
            if sdk_auth_error:
                processing_success = True  # Override for demo
                processing_error = "DEMO MODE: Using mock data because API authentication failed"
                all_evidence = mock_evidence
                
                # Update the stored data
                processed_docs[batch_id] = {
                    "evidence": all_evidence,
                    "files": temp_paths,
                    "filenames": temp_filenames,
                    "processed_at": time.time(),
                    "processing_success": processing_success,
                    "processing_error": processing_error,
                    "is_mock_data": True
                }
        
        return jsonify({
            "batch_id": batch_id,
            "document_count": len(temp_paths),
            "processing_time_seconds": processing_time,
            "evidence": all_evidence if processing_success else {},
            "status": "success" if processing_success else "failed",
            "error": processing_error,
            "sdk_auth_error": sdk_auth_error
        })
        
    except Exception as e:
        print(f"Error processing documents: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e), "sdk_auth_error": sdk_auth_error}), 500
    
    finally:
        # Don't delete temp files here - we need them for the batch
        pass

@app.route('/get-document-status/<batch_id>', methods=['GET'])
def get_document_status(batch_id):
    """Get the processing status for a specific batch"""
    if batch_id not in processed_docs:
        return jsonify({"error": "Batch ID not found"}), 404
    
    batch_data = processed_docs[batch_id]
    
    return jsonify({
        "batch_id": batch_id,
        "status": "completed" if batch_data.get("processing_success", False) else "failed",
        "error": batch_data.get("processing_error"),
        "processed_at": batch_data.get("processed_at"),
        "document_count": len(batch_data.get("filenames", [])),
        "sdk_auth_error": batch_data.get("sdk_auth_error", sdk_auth_error),
        "is_mock_data": batch_data.get("is_mock_data", False)
    })

@app.route('/get-document-data/<batch_id>', methods=['GET'])
def get_document_data(batch_id):
    """Get the processed data for a specific batch"""
    if batch_id not in processed_docs:
        return jsonify({"error": "Batch ID not found"}), 404
    
    batch_data = processed_docs[batch_id]
    
    if not batch_data.get("processing_success", False):
        return jsonify({
            "error": "Document processing failed",
            "error_details": batch_data.get("processing_error"),
            "sdk_auth_error": batch_data.get("sdk_auth_error", sdk_auth_error)
        }), 500
    
    return jsonify({
        "batch_id": batch_id,
        "evidence": batch_data.get("evidence", {}),
        "processed_at": batch_data.get("processed_at"),
        "document_count": len(batch_data.get("filenames", [])),
        "filenames": batch_data.get("filenames", []),
        "is_mock_data": batch_data.get("is_mock_data", False),
        "sdk_auth_error": batch_data.get("sdk_auth_error", sdk_auth_error)
    })

@app.route('/ask-question', methods=['POST'])
def ask_question():
    """Process a question about the PDFs using OpenAI API - identical to working implementation"""
    data = request.json
    
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    # Support both interface patterns
    if "batch_id" in data and "question" in data:
        batch_id = data["batch_id"]
        query = data["question"]
        
        # Check if the batch exists
        if batch_id not in processed_docs:
            return jsonify({"error": "Batch ID not found"}), 404
            
        # Check if processing succeeded
        if not processed_docs[batch_id].get("processing_success", False):
            return jsonify({
                "error": "Document processing failed",
                "error_details": processed_docs[batch_id].get("processing_error"),
                "sdk_auth_error": processed_docs[batch_id].get("sdk_auth_error", sdk_auth_error)
            }), 500
            
        # Get document evidence from the stored batch
        evidence = processed_docs[batch_id]["evidence"]
    elif "evidence" in data and ("query" in data or "question" in data):
        evidence = data["evidence"]
        query = data.get("query", data.get("question"))
    else:
        return jsonify({"error": "Missing required fields"}), 400
    
    try:
        # Initialize OpenAI client
        client = OpenAI(api_key=openai_api_key)
        
        # Format the prompt - exactly like working implementation
        prompt = f"""
        Use the following JSON evidence extracted from the uploaded PDF files, answer the following question based on that evidence.
        Please return your response in JSON format with three keys: 
        1. "answer": Your detailed answer to the question
        2. "reasoning": Your step-by-step reasoning process
        3. "best_chunks": A list of objects with:
           - "file"
           - "page"
           - "bboxes" (each bbox is [x, y, w, h])
           - "captions" (list of text snippets)
           - "reason"
           
        Question: {query}

        Evidence: {json.dumps(evidence)}
        """
        
        # Call OpenAI API - exactly like working implementation
        chat_response = client.chat.completions.create(
            model="gpt-4o",  # or your preferred model
            messages=[
                {
                    "role": "system",
                    "content": ("You are a helpful expert that analyses context deeply "
                                "and reasons through it without assuming anything.")
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.5,
        )
        
        raw_response = chat_response.choices[0].message.content.strip()
        
        # Handle potential code block wrapping - exactly like working implementation
        if raw_response.startswith("```"):
            lines = raw_response.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            raw_response = "\n".join(lines).strip()
        
        try:
            parsed_response = json.loads(raw_response)
            return jsonify(parsed_response)
        except json.JSONDecodeError:
            return jsonify({
                "answer": "Error parsing AI response as JSON. Raw response: " + raw_response[:100] + "...",
                "reasoning": "JSON parsing error",
                "best_chunks": []
            }), 500
            
    except Exception as e:
        print(f"Error in ask-question endpoint: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/cleanup/<batch_id>', methods=['DELETE'])
def cleanup_batch(batch_id):
    """Clean up temporary files for a specific batch"""
    if batch_id not in processed_docs:
        return jsonify({"error": "Batch ID not found"}), 404
    
    # Delete the temporary files
    for file_path in processed_docs[batch_id]["files"]:
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
        except Exception as e:
            print(f"Error removing file {file_path}: {e}")
    
    # Remove from the processed docs dictionary
    del processed_docs[batch_id]
    
    return jsonify({"status": "success", "message": "Batch cleaned up successfully"})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))  # Using port 5001
    app.run(host='0.0.0.0', port=port, debug=True)