# Setting Up Landing AI SDK

This document explains how to configure the document processing microservice to use the real Landing AI SDK instead of the mock implementation.

## Prerequisites

1. You need a Landing AI account with API access
2. You need to obtain an API key and client ID from Landing AI

## Configuration Steps

1. Install the required packages:

```bash
cd doc-processor
pip install -r requirements.txt
```

2. Update the `.env` file with your Landing AI credentials:

```
# Landing AI SDK Configuration
LANDING_AI_API_KEY=your_actual_api_key
LANDING_AI_CLIENT_ID=your_actual_client_id

# Document Processing Configuration
CHUNK_BATCH_SIZE=10
MAX_WORKERS=4
MAX_RETRIES=3
```

3. Restart the document processing microservice:

```bash
python app.py
```

## Verifying Real SDK Usage

When you start the service, you should see output similar to:

```
Using real agentic_doc SDK
Document Processing Configuration:
  CHUNK_BATCH_SIZE: 10
  MAX_WORKERS: 4
  MAX_RETRIES: 3
  USING_REAL_SDK: True
```

If you see "Using local mock SDK" instead, check that:
1. The Landing AI SDK packages are properly installed
2. Your API credentials are correct in the .env file
3. You have an active Landing AI subscription

## Troubleshooting

If you encounter issues with the real SDK:

1. Check that your credentials are valid
2. Verify your Landing AI subscription is active
3. Look for error messages in the console output
4. The service will fall back to the mock SDK if there are any issues with the real SDK

## Mock vs Real SDK

The mock SDK provides basic functionality for development and testing purposes:
- Text extraction from PDFs using PyMuPDF
- Simulated bounding box coordinates
- Basic question answering (not using real AI)

The real Landing AI SDK provides:
- Advanced document understanding
- High-accuracy extraction with AI
- Sophisticated question answering with LLMs
- Better handling of complex documents

For production use, always use the real SDK.