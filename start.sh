#!/bin/sh
# Start nginx in the background
nginx

# Start Gunicorn in the foreground
gunicorn -w 2 -k uvicorn.workers.UvicornWorker --forwarded-allow-ips='*' -b 127.0.0.1:8000 main:app --timeout 300
