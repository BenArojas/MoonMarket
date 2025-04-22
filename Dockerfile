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
    pip install --no-cache-dir -r requirements.txt && \
    apk del build-base linux-headers libffi-dev

# Stage 3: Final image
FROM python:3.10-alpine
RUN apk add --no-cache nginx
WORKDIR /app
# Copy installed Python dependencies and executables from builder stage
COPY --from=builder /usr/local/lib/python3.10/site-packages /usr/local/lib/python3.10/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin
COPY backend .
COPY --from=frontend /app/dist static/
COPY nginx.conf /etc/nginx/nginx.conf
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh
EXPOSE 80
CMD ["/app/start.sh"]