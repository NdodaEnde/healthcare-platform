# Document Processing Integration

This directory contains the document processing microservice for the SurgiScan healthcare platform. It uses the Landing AI SDK to process and analyze document content, enabling intelligent querying of document information.

## Architecture

The integration consists of two main components:

1. **Document Processing Microservice**
   - A Flask-based microservice that processes PDF documents
   - Extracts text and coordinates using SDK or mock implementation
   - Provides API endpoints for document processing and question answering

2. **Frontend Integration**
   - PDF document upload and storage in Supabase
   - Document viewing with evidence highlighting
   - Q&A interface for intelligent document querying

## API Endpoints

### Document Processor Microservice

- `GET /health`: Health check endpoint
- `POST /process-documents`: Process uploaded documents
- `GET /get-document-data/<batch_id>`: Get processed document data
- `POST /ask-question`: Answer questions about documents
- `DELETE /cleanup/<batch_id>`: Clean up temporary files

### Healthcare Platform

- `POST /api/documents/upload`: Upload documents for processing
- `GET /api/documents/[id]/data`: Get document data with highlights
- `POST /api/documents/query`: Query document content

## Setup

1. Start the document processor microservice:
   ```bash
   cd doc-processor
   pip install -r requirements.txt
   python app.py
   ```

2. Configure the healthcare platform:
   - Set `DOCUMENT_PROCESSOR_API_URL` environment variable to the microservice URL
   - Ensure Supabase storage is configured for document uploads

## Usage Flow

1. Users upload documents via the healthcare platform
2. Documents are stored in Supabase storage
3. Document processor microservice processes the documents
4. Users can view documents and ask questions through the Q&A interface
5. Answers are displayed with highlighted evidence in the PDF

## Integration with Landing AI SDK

The microservice is designed to work with the Landing AI SDK for document parsing. It includes a fallback mock implementation for development and testing purposes.