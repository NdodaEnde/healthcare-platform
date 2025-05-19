FROM python:3.10-slim

WORKDIR /app

# Set SDK environment variables BEFORE installing dependencies
ENV BATCH_SIZE=20
ENV MAX_WORKERS=5
ENV MAX_RETRIES=100
ENV RETRY_LOGGING_STYLE=inline_block

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create a directory for temporary file uploads
RUN mkdir -p /tmp/doc_processor_uploads && chmod 777 /tmp/doc_processor_uploads

# Expose port (using 5001 to avoid conflicts with AirPlay on macOS)
EXPOSE 5001

# Run the application with environment variables set
CMD ["gunicorn", "--bind", "0.0.0.0:5001", "--timeout", "300", "app:app"]