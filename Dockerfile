# Stage 1: Build frontend
FROM node:18-alpine AS frontend
WORKDIR /app
COPY frontend .
RUN npm install && npm run build

# Stage 2: Install Python dependencies
FROM python:3.10-alpine AS builder
WORKDIR /app
COPY backend/requirements.txt .
RUN apk add --no-cache build-base linux-headers libffi-dev && \
    pip install --no-cache-dir --no-binary cryptography,pymongo -r requirements.txt --target=/install && \
    apk del build-base linux-headers libffi-dev

# Stage 3: Final image
FROM python:3.10-alpine
RUN apk add --no-cache nginx
WORKDIR /app
COPY --from=builder /install /usr/local/lib/python3.10/site-packages
COPY backend .
COPY --from=frontend /app/dist static/
COPY nginx.conf /etc/nginx/nginx.conf
RUN echo '#!/bin/sh\n\
nginx & \n\
gunicorn -w 2 -k uvicorn.workers.UvicornWorker --forwarded-allow-ips="*" -b 127.0.0.1:8000 main:app --timeout 300\n\
' > /app/start.sh \
&& chmod +x /app/start.sh
EXPOSE 80
CMD ["/app/start.sh"]