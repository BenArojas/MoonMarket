#!/bin/bash

# Install Nginx if not already installed
if ! command -v nginx &> /dev/null; then
    apt-get update
    apt-get install -y nginx
fi

# Create Nginx config directory if it doesnt exist
mkdir -p /etc/nginx/sites-available

# Write Nginx configuration
cat > /etc/nginx/sites-available/default << 'EOL'
server {
    listen ${PORT};
    server_name ${WEBSITE_HOSTNAME};

    # Enable compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/js text/xml text/javascript application/javascript application/json application/xml image/svg+xml;

    # Serve static files
    location / {
        root /home/site/wwwroot/static;
        index index.html;
        try_files $uri /index.html;
        
        # Cache settings for static files
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, no-transform";
        }
    }

    # Proxy API requests to FastAPI
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOL

# Start Nginx
service nginx start
sleep 5
# Start FastAPI application
gunicorn -w 2 -k uvicorn.workers.UvicornWorker --forwarded-allow-ips="*" -b 127.0.0.1:8000 main:app