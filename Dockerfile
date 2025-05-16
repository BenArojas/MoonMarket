# Stage 1: Build frontend
FROM node:18-alpine AS frontend
WORKDIR /app
COPY frontend .
RUN npm install && npm run build

# Stage 2: Install Python dependencies
FROM python:3.10-alpine AS python-builder
WORKDIR /app
COPY backend/requirements.txt .
RUN apk add --no-cache build-base linux-headers libffi-dev && \
    pip install --no-cache-dir -r requirements.txt && \
    apk del build-base linux-headers libffi-dev

# Stage 3: Install Java and download Interactive Brokers Gateway
FROM debian:bookworm-slim AS java-builder
WORKDIR /app
RUN apt-get update && apt-get upgrade -y && \
    apt-get install -y openjdk-17-jre-headless unzip curl && \
    mkdir gateway && cd gateway && \
    curl -O https://download2.interactivebrokers.com/portal/clientportal.gw.zip && \
    unzip clientportal.gw.zip && rm clientportal.gw.zip && \
    apt-get remove -y unzip curl && apt-get autoremove -y && apt-get clean

# Stage 4: Final image
FROM python:3.10-alpine
# Install Nginx and Java runtime
RUN apk add --no-cache nginx openjdk17-jre

WORKDIR /app

# Copy Python dependencies from python-builder
COPY --from=python-builder /usr/local/lib/python3.10/site-packages /usr/local/lib/python3.10/site-packages
COPY --from=python-builder /usr/local/bin /usr/local/bin

# Copy Java gateway from java-builder
COPY --from=java-builder /app/gateway /app/gateway

# Copy application files
COPY backend .
COPY --from=frontend /app/dist static/
COPY webapp webapp
COPY scripts scripts
COPY conf.yaml gateway/root/conf.yaml
COPY nginx.conf /etc/nginx/nginx.conf
COPY start.sh /app/start.sh

# Make start script executable
RUN chmod +x /app/start.sh

# Expose ports for Nginx and Interactive Brokers Gateway
EXPOSE 80 5055 5056

# Run the combined application
CMD ["/app/start.sh"]