FROM python:3.11-slim
   WORKDIR /app/backend
   COPY backend/requirements.txt ./
   RUN python -m venv /app/venv && \
       . /app/venv/bin/activate && \
       pip install --no-cache-dir -r requirements.txt
   COPY backend ./
   CMD ["/app/venv/bin/gunicorn", "-w", "2", "-k", "uvicorn.workers.UvicornWorker", "--forwarded-allow-ips=*", "-b", "0.0.0.0:8000", "main:app", "--reload"]