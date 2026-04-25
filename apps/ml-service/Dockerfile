FROM python:3.10-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN python -m pip install --no-cache-dir \
    "fastapi>=0.104.1" \
    "uvicorn>=0.24.0" \
    "pillow>=10.1.0" \
    "python-multipart>=0.0.6"

COPY ml_service_mock.py /app/ml_service_mock.py

EXPOSE 8000

CMD ["uvicorn", "ml_service_mock:app", "--host", "0.0.0.0", "--port", "8000"]
