import sys
import os
import uvicorn
from pathlib import Path
import asyncio

# Add S:\Project to Python path
sys.path.append(str(Path(__file__).parent.parent))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from backend.routes.api import router as api_router
from backend.routes.oauth import router as oauth_router

# Configuration
os.makedirs("parsed_data", exist_ok=True)
os.makedirs("faiss_index", exist_ok=True)

# Initialize FastAPI app
app = FastAPI(title="Configuration Guidance API")

# Add session middleware (required for OAuth)
app.add_middleware(SessionMiddleware, secret_key=os.environ.get("SECRET_KEY", "your-secret-key-here"))

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router)
app.include_router(oauth_router)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)