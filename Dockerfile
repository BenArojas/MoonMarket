# Use official Python runtime as base
FROM python:3.10-slim

# Install nginx and a specific Node.js version (20.x)
RUN apt-get update && apt-get install -y nginx curl \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Verify Node.js and npm versions (optional, for debugging)
RUN node --version && npm --version

# Set work directory
WORKDIR /app

# Copy frontend files and build them
COPY frontend /app/frontend
RUN cd /app/frontend \
    && npm install \
    && npm run build \
    && mkdir -p /app/backend/static \
    && mv /app/frontend/dist/* /app/backend/static/ \
    && rm -rf /app/frontend

# Copy requirements first for caching
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend files (static/ now contains frontend build)
COPY backend .

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create startup script
RUN echo '#!/bin/bash\n\
nginx & \n\
gunicorn -w 2 -k uvicorn.workers.UvicornWorker --forwarded-allow-ips="*" -b 127.0.0.1:8000 main:app --timeout 300\n\
' > /app/start.sh \
&& chmod +x /app/start.sh

# Expose port
EXPOSE 80

# Start services
CMD ["/app/start.sh"]