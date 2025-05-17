# Base image
FROM debian:bookworm-slim

# Update and install dependencies
RUN apt-get update && apt-get upgrade -y && \
    apt-get install -y openjdk-17-jre-headless unzip curl nginx supervisor \
                      python3 python3-pip python3.11-venv build-essential && \
    apt-get clean

# Install Node.js for frontend build
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs

WORKDIR /app

# Build frontend
COPY frontend /app/frontend
RUN cd frontend && npm install && npm run build && \
    mv dist /app/static && cd /app && rm -rf frontend

# Install Python dependencies
COPY backend/requirements.txt /app/
RUN python3 -m venv /app/venv
RUN . /app/venv/bin/activate && pip install --no-cache-dir -r requirements.txt

# Download and setup IBKR Client Portal Gateway
RUN mkdir gateway && cd gateway && \
    curl -O https://download2.interactivebrokers.com/portal/clientportal.gw.zip && \
    unzip clientportal.gw.zip && rm clientportal.gw.zip && \
    ls -lR . && \  
    chmod +x bin/run.sh  

# Generate self-signed certificate
RUN keytool -genkey -keyalg RSA -alias selfsigned -keystore gateway/root/cacert.jks \
    -storepass mywebapi -validity 730 -keysize 2048 -dname "CN=localhost"

# Copy application files
COPY backend /app/
COPY conf.yaml /app/gateway/root/conf.yaml
COPY nginx.conf /etc/nginx/nginx.conf
COPY supervisord.conf /app/supervisord.conf
COPY start.sh /app/start.sh

# Make start script executable
RUN chmod +x /app/start.sh

# Expose ports for Nginx and Gateway
EXPOSE 80 5055

# Run the application
CMD ["/app/start.sh"]