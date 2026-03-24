FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY ml_requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r ml_requirements.txt

# Copy ML service
COPY ml_service.py .

# Expose port
EXPOSE 8000

# Run the service
CMD ["python", "ml_service.py"]
