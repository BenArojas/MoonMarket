# 🌙 MoonMarket
MoonMarket is a social portfolio tracking application that allows you to monitor your investments while connecting with friends to see their portfolio compositions.
![home-page](/frontend/public/home-page.png)


# Features
 - Portfolio tracking and management
 - Real-time stock data visualization using D3.js
 - Social features to connect with friends
 - Portfolio sharing capabilities
Interactive charts and analytics
![home-page](/frontend/public/space-page.png)

# Tech Stack
Frontend: 
- React
- React Router DOM for navigation
- TanStack Query (formerly React Query) for data fetching
- D3.js for advanced data visualization

Backend:
- FastAPI framework
- MongoDB database
- Beanie ODM for MongoDB interactions

# Prerequisites
Before running the application, make sure you have:

- Node.js and npm installed
- Python 3.8+ installed
- MongoDB installed and running
- Financial Modeling Prep (FMP) API key

# Environment Variables
Create a .env file in the in the frontend directory with the following variables:
- VITE_PROD_BACKEND_BASE_URL
- VITE_DEVELOPMENT_BACKEND_BASE_URL
- IS_PROD

Create a .env file in the in the backend directory with the following variables:
- DB_URL
- DB_NAME
- FMP_BASE_URL
- ENV_MODE


# Installation
* Backend Setup
Navigate to backend directory - cd backend

* Create virtual environment - python -m venv venv

* Activate virtual environment
On Windows - venv\Scripts\activate
On macOS/Linux - source venv/bin/activate

* Install dependencies
pip install -r requirements.txt

* Start the backend server
py main.py


* Frontend Setup
Navigate to frontend directory - cd frontend

* Install dependencies - npm install

* Start the development server - npm start

* API Key Setup
Visit Financial Modeling Prep
Create an account and obtain your API key
Add the key in the dialog after creating your account

# Usage

Register an account or log in,
Add your portfolio by entering your stock positions.
View and analyze your portfolio performance.
Connect with friends using their username or email and
Explore their portfolios and investment strategies


# Development vs Production Setup

## Development Mode
In development mode, the application runs with a split architecture:
- Frontend runs on port 5173 (Vite development server)
- Backend runs on port 8000
- API calls are made directly to the backend server

### Development Environment Setup
1. Backend (.env):
```
ENV_MODE = "development"
DB_URL = "your_mongodb_url"
DB_NAME = "stock_db"
FMP_BASE_URL = "https://financialmodelingprep.com/api/v3"
```

2. Frontend (.env):
```
VITE_BASE_URL=http://localhost:8000/

```

## Production Mode
In production mode, the application runs as a single service:
- Frontend is built and served as static files from the backend
- All requests go through a single domain
- API routes are prefixed with `/api`

### Production Deployment
The GitHub Actions workflow handles the production deployment:
1. Builds the frontend (`npm run build`)
2. Moves the built files to `backend/static`
3. Deploys the combined application to Azure

### Production Environment Setup
1. Backend (.env):
```
ENV_MODE = "production"
DB_URL = "your_mongodb_url"
DB_NAME = "stock_db"
FMP_BASE_URL = "https://financialmodelingprep.com/api/v3"
```

2. Frontend (.env.production):
```
VITE_BASE_URL=/api
```

## Architecture Overview
### Development
```
Frontend (localhost:5173) ─── API Calls ───> Backend (localhost:8000)
```

### Production
```
Single Server (port 8000)
├── /api/* ──> Backend API Routes
└── /* ────> Static Frontend Files
```