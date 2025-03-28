# Use official Python runtime
FROM python:3.10-slim

# Install nginx only (no redis needed)
RUN apt-get update && apt-get install -y nginx \
    && rm -rf /var/lib/apt/lists/*

# Set work directory
WORKDIR /app

# Copy requirements first for caching
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend files
COPY backend .

# Copy frontend build to static directory
COPY frontend/dist static/

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create startup script - removed redis-server
RUN echo '#!/bin/bash\n\
nginx & \n\
gunicorn -w 2 -k uvicorn.workers.UvicornWorker --forwarded-allow-ips="*" -b 127.0.0.1:8000 main:app --timeout 300\n\
' > /app/start.sh \
&& chmod +x /app/start.sh

# Expose port
EXPOSE 80

# Start services
CMD ["/app/start.sh"]