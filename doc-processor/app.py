from flask import Flask, request, jsonify
import os
import tempfile
import uuid
import json
import sys
import time
from werkzeug.utils import secure_filename
from flask_cors import CORS

# Add parent directory to path to access the Mock SDK
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
try:
    # Try to import the real SDK if available
    from agentic_doc.parse import parse_documents
    print("Using real agentic_doc SDK")
except ImportError:
    # If real SDK not available, use mock SDK
    try:
        from next_pdf_app.backend.mock_sdk import parse_documents
        print("Using mock SDK from next-pdf-app")
    except ImportError:
        # Fallback to local mock implementation
        from mock_sdk import parse_documents
        print("Using local mock SDK")

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

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
    return jsonify({"status": "healthy", "service": "document-processor"})

@app.route('/process-documents', methods=['POST'])
def process_documents():
    """
    Process uploaded documents using the SDK
    """
    if 'files' not in request.files:
        return jsonify({"error": "No files provided"}), 400
    
    files = request.files.getlist('files')
    if not files or all(file.filename == '' for file in files):
        return jsonify({"error": "No files selected"}), 400
    
    # Save uploaded files to temp directory
    saved_files = []
    for file in files:
        if file and file.filename:
            filename = secure_filename(file.filename)
            temp_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{uuid.uuid4()}_{filename}")
            file.save(temp_path)
            saved_files.append(temp_path)
    
    if not saved_files:
        return jsonify({"error": "No valid files uploaded"}), 400
    
    try:
        # Process documents using SDK
        start_time = time.time()
        result = parse_documents(saved_files)
        processing_time = time.time() - start_time
        
        # Generate a unique ID for this batch of documents
        batch_id = str(uuid.uuid4())
        processed_docs[batch_id] = {
            "result": result,
            "files": saved_files,
            "processed_at": time.time()
        }
        
        # Format the response
        formatted_result = {
            "batch_id": batch_id,
            "document_count": len(saved_files),
            "processing_time_seconds": processing_time,
            "status": "success"
        }
        
        return jsonify(formatted_result)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/get-document-data/<batch_id>', methods=['GET'])
def get_document_data(batch_id):
    """
    Retrieve processed document data by batch ID
    """
    if batch_id not in processed_docs:
        return jsonify({"error": "Batch ID not found"}), 404
    
    # Return the processed document data
    return jsonify({
        "batch_id": batch_id,
        "result": processed_docs[batch_id]["result"],
        "files": [os.path.basename(f) for f in processed_docs[batch_id]["files"]],
        "processed_at": processed_docs[batch_id]["processed_at"]
    })

@app.route('/ask-question', methods=['POST'])
def ask_question():
    """
    Answer a question about processed documents
    """
    data = request.json
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    # Check required fields
    if "batch_id" not in data or "question" not in data:
        return jsonify({"error": "Missing required fields: batch_id and question"}), 400
    
    batch_id = data["question"]
    question = data["question"]
    
    # Check if the batch exists
    if batch_id not in processed_docs:
        return jsonify({"error": "Batch ID not found"}), 404
    
    try:
        # Get document evidence
        evidence = processed_docs[batch_id]["result"]
        
        # For now, return a mock response
        # TODO: Implement actual OpenAI integration here
        response = {
            "answer": f"This is a mock answer to the question: {question}",
            "reasoning": "This is placeholder reasoning. Real integration would use OpenAI.",
            "evidence": [
                {"text": "Sample evidence text", "score": 0.95}
            ]
        }
        
        return jsonify(response)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/cleanup/<batch_id>', methods=['DELETE'])
def cleanup_batch(batch_id):
    """
    Clean up temporary files for a specific batch
    """
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
    # Set the port based on environment variable or default to 5001
    # Using 5001 instead of 5000 to avoid conflicts with AirPlay on macOS
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=True)