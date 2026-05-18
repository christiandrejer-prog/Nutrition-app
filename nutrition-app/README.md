# Nutrition Tracker App

A web application for tracking nutrition, built with FastAPI backend and vanilla JavaScript frontend.

## Features

- Manage nutrients, foods, and meals
- Add nutrients to foods and calculate macros
- Barcode scanning to import food data from Open Food Facts
- Edit and delete functionality for all entities

## Setup

### Backend

1. Install Python dependencies:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. Run the backend:
   ```bash
   python -m uvicorn app.main:app --reload
   ```

### Frontend

Open `frontend/index.html` in a web browser.

## Deployment (Free Options)

### Option 1: GitHub Pages + Render (Free Tier)

**Backend (Render - Free Tier)**
1. Create a Render account at https://render.com
2. Click "New +" and select "Web Service"
3. Connect your GitHub repository
4. Set the build command: `pip install -r backend/requirements.txt`
5. Set the start command: `uvicorn app.main:app --host 0.0.0.0 --port 8080` (from backend folder)
6. Deploy and note your URL

**Frontend (GitHub Pages)**
1. Push your code to GitHub
2. Go to repository Settings → Pages
3. Set source to `main` branch, `/docs` folder (GitHub Pages does not publish arbitrary folders like `/frontend`)
4. Copy your frontend files into a `docs/` folder in the repository, or use the repo root if you prefer
5. Update `API_URL` in `frontend/app.js` to your Render backend URL
6. Your app will be live at `https://yourusername.github.io/Nutrition-app`

### Option 2: Local Sharing (Easiest for Testing)

**For sharing with friends on local network:**
1. Run backend normally
2. Use ngrok to expose it: `ngrok http 8000`
3. Get the ngrok URL and update `API_URL` in `app.js`
4. Share the frontend file directly or run a simple HTTP server
5. Friends can access from their devices on the same network

**Commands:**
```bash
# Terminal 1: Backend
cd backend
python -m uvicorn app.main:app --reload

# Terminal 2: Frontend server
cd frontend
python -m http.server 8080

# Terminal 3: Expose with ngrok
ngrok http 8000
```

### Option 3: PythonAnywhere (Free Tier for Backend)

1. Sign up at https://pythonanywhere.com (free tier available)
2. Upload your backend code
3. Configure a web app with FastAPI
4. Get your backend URL
5. Deploy frontend on GitHub Pages with updated API_URL

## Barcode Scanning

- Uses QuaggaJS library
- Requires camera access
- Fetches data from Open Food Facts API

## API Endpoints

- Nutrients: `/nutrients`
- Foods: `/foods`
- Meals: `/meals`

See backend code for full API documentation.