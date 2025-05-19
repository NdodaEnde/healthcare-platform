# Document Processing Integration with Landing AI SDK

This directory contains the document processing microservice for the SurgiScan healthcare platform. It uses the Landing AI SDK (agentic-doc) to process and analyze document content, enabling intelligent querying of document information with advanced extraction features.

## Architecture

The integration consists of two main components:

1. **Document Processing Microservice**
   - A Flask-based microservice that processes PDF documents
   - Extracts text and coordinates using the Landing AI SDK (with fallback to mock implementation)
   - Provides API endpoints for document processing and question answering
   - Uses OpenAI API for intelligent document question answering
   - Implements advanced extraction features from the Landing AI SDK

2. **Frontend Integration**
   - PDF document upload and storage in Supabase
   - Document viewing with evidence highlighting
   - Q&A interface for intelligent document querying
   - Displays answers with highlighted evidence from source documents

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

### Using the Real Landing AI SDK

By default, the microservice tries to use the real Landing AI SDK. If not available, it falls back to a mock implementation.

To use the real SDK:
1. Make sure the Landing AI SDK is installed (included in requirements.txt)
2. Configure your API credentials in the `.env` file:
   ```
   # Landing AI SDK Configuration
   LANDING_AI_API_KEY=your_actual_api_key
   LANDING_AI_CLIENT_ID=your_actual_client_id
   ```
3. Restart the service

See [LANDING_AI_SETUP.md](./LANDING_AI_SETUP.md) for detailed setup instructions.

### SDK Configuration

The document processor is configured to use the same settings as your existing working implementation. Configuration is done through environment variables in the `.env` file:

- `BATCH_SIZE`: Number of chunks to process in a batch (default: 20)
- `MAX_WORKERS`: Maximum number of parallel workers (default: 5)
- `MAX_RETRIES`: Maximum number of retries for API calls (default: 100)
- `RETRY_LOGGING_STYLE`: Style for retry logging (default: inline_block)
- `VISION_AGENT_API_KEY`: The Landing AI SDK API key
- `OPENAI_API_KEY`: OpenAI API key for question answering

**Important**: These environment variables must be set BEFORE the SDK is imported to take effect properly.

### Extraction Features

The document processor leverages the following extraction features from the Landing AI SDK:

1. **Document Processing**
   - Accurate text extraction with bounding box coordinates
   - Uses `ChunkType.PRETTY` for better extraction results
   - Preserves original file names for better identification
   - Handles multiple documents in parallel

2. **Question Answering**
   - Uses OpenAI GPT-4o for intelligent document question answering
   - Returns specific evidence with bounding box coordinates for highlighting
   - Provides reasoning alongside answers for better explainability
   - Supports both direct evidence and stored batch evidence formats

3. **Evidence Highlighting**
   - Returns evidence coordinates normalized to page dimensions (0-1 range)
   - Compatible with the PDF viewer's highlighting capabilities
   - Identifies the most relevant sections for each answer

These extraction features match the functionality from your existing working implementation, ensuring consistent behavior and results.