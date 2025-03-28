# 🌙 MoonMarket
MoonMarket is a social portfolio tracking application that lets you monitor your investments and connect with friends to explore their portfolio compositions. This README is for the `master` branch, which is the production-ready setup for cloud deployment using Docker, Redis, and Nginx.

![home-page](/frontend/public/home-page.png)

## Features
- Portfolio tracking and management
- Real-time stock data visualization with D3.js and Lightweight Charts
- Social features to connect with friends
- Portfolio sharing capabilities
- AI-powered portfolio analysis via Perplexity
- Market sentiment analysis from X posts
- Interactive charts and analytics

![space-page](/frontend/public/space-page.png)
## Features
- Portfolio tracking and management
- Real-time stock data visualization with D3.js and Lightweight Charts
- Social features to connect with friends
- Portfolio sharing capabilities
- AI-powered portfolio analysis via Perplexity
- Market sentiment analysis from X posts
- Interactive charts and analytics

![space-page](/frontend/public/space-page.png)

## Usage
1. Deploy to Azure or run locally with Docker.
2. Register or log in via the frontend.
3. Add stock positions to your portfolio.
4. Analyze performance with AI insights and sentiment data.
5. Connect with friends by username or email.

## Tech Stack
### Frontend
- React (with Vite)
- React Router DOM for navigation
- TanStack Query for data fetching
- D3.js and Lightweight Charts for visualization
- TailwindCSS for styling
- TanStack Query for data fetching
- D3.js and Lightweight Charts for visualization
- TailwindCSS for styling

### Backend
### Backend
- FastAPI framework
- MongoDB with Beanie ODM
- MongoDB with Beanie ODM
- Redis for caching
- Nginx as reverse proxy
- Gunicorn + Uvicorn for production serving

### Deployment
- Docker for containerization
- Azure Container Apps for cloud hosting
- GitHub Actions for CI/CD

## Deployment (Cloud Production)
The `master` branch is configured for cloud deployment using Docker, with Nginx serving static files and proxying API requests to FastAPI, and Redis for caching.

### Prerequisites
- Docker installed (for local testing)
- Azure account with Container Apps set up
- MongoDB instance (e.g., MongoDB Atlas)
- Redis instance (e.g., Redis Cloud)
- API keys for Financial Modeling Prep (FMP), Apify, and Perplexity

### Environment Variables
Create a `.env` file in the `backend/` directory with these variables:
```env
DB_URL=<your_mongodb_url>
DB_NAME=<your_database_name>
DB_URL=<your_mongodb_url>
DB_NAME=<your_database_name>
FMP_BASE_URL=https://financialmodelingprep.com/api/v3
REDIS_URL=<your_redis_url>
APIFY_API_TOKEN=<your_apify_token>
PERPLEXITY_API_TOKEN=<your_perplexity_token>
```
### Docker Setup
The Dockerfile builds a production-ready image:

- Base: python:3.10-slim
- Installs: Nginx, Python dependencies
- Serves: Frontend static files via Nginx, Backend via Gunicorn/Uvicorn
- Port: 80
## To build and run locally:
### Build the frontend:

- cd frontend
- npm install
- npm run build

### Build and run the Docker container:
- docker build -t moonmarket:latest .
- docker run -p 80:80 --env-file backend/.env moonmarket:latest
- Access at http://localhost.

### CI/CD with GitHub Actions
Pushing to master triggers:

- Build: Builds the frontend (Node.js 18), then the Docker image, and pushes to your container registry.
- Deploy: Deploys to Azure Container Apps using the image moonmarket:<github.run_number>.

+ Secrets required in GitHub:

- REGISTRY_LOGIN_SERVER
- REGISTRY_USERNAME
- REGISTRY_PASSWORD
- AZURE_CREDENTIALS
- CONTAINER_APP_NAME
- RESOURCE_GROUP
- CONTAINER_APP_ENVIRONMENT
See .github/workflows/<workflow-file>.yml for details.

### API Key Setup
- FMP: Get from Financial Modeling Prep.
- Apify: For X scraping, get from Apify.
- Perplexity: For AI analysis, get from Perplexity.
Add these to your .env file or Azure environment variables.

## Architecture
Docker Container (Port 80)
├── Nginx
│   ├── /* → Static Frontend Files (frontend/dist)
│   └── /api/* → FastAPI (127.0.0.1:8000)
├── FastAPI (Gunicorn + Uvicorn)
└── External Services
    ├── MongoDB (DB_URL)
    └── Redis (REDIS_URL)

## Local Development
For local testing without Docker, use the local branch instead. See its README for setup instructions.