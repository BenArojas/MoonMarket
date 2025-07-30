FROM node:20-slim
   WORKDIR /app/frontend
   COPY frontend/package.json frontend/package-lock.json* ./
   RUN npm install
   COPY frontend ./
   CMD ["npm", "start"]a# Stage 1: Build the React application
   FROM node:18-alpine as builder
   
   WORKDIR /app
   
   # Copy package.json and package-lock.json and install dependencies
   COPY package*.json ./
   RUN npm install
   
   # Copy the rest of the frontend source code
   COPY . .
   
   # Build the production version of the app
   RUN npm run build
   
   # Stage 2: Serve the app with Nginx
   FROM nginx:1.27-alpine
   
   # Copy the custom Nginx configuration
   COPY nginx.conf /etc/nginx/conf.d/default.conf
   
   # Copy the static build files from the builder stage
   COPY --from=builder /app/dist /usr/share/nginx/html
   
   # Expose port 80
   EXPOSE 80
   
   # Start Nginx
   CMD ["nginx", "-g", "daemon off;"]