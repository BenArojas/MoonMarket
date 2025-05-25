FROM node:20-slim
   WORKDIR /app/frontend
   COPY frontend/package.json frontend/package-lock.json* ./
   RUN npm install
   COPY frontend ./
   CMD ["npm", "start"]