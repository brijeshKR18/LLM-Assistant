from fastapi import APIRouter, Request, Response, HTTPException, Depends
from fastapi.responses import RedirectResponse
from authlib.integrations.starlette_client import OAuth
from starlette.middleware.sessions import SessionMiddleware
import os
from typing import Dict, Any

# OAuth configuration
GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID','600330164369-paluceqnco6eku36jpha2s2c4vp19dng.apps.googleusercontent.com')
GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET','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')
FRONTEND_URL = os.environ.get('FRONTEND_URL', "http://localhost:5173")

# Initialize OAuth
oauth = OAuth()
oauth.register(
    name='google',
    client_id=GOOGLE_CLIENT_ID,
    client_secret=GOOGLE_CLIENT_SECRET,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={'scope': 'openid email profile'},
)

router = APIRouter()

@router.get('/auth/login')
async def login(request: Request):
    """Initiate Google OAuth login"""
    redirect_uri = request.url_for('authorize')
    # Force account selection and prevent automatic sign-in
    return await oauth.google.authorize_redirect(
        request, 
        redirect_uri, 
        prompt='select_account',  # Force Google to show account selection
        access_type='offline'     # Ensure we can get refresh tokens if needed
    )

@router.get('/auth/authorize')
async def authorize(request: Request):
    """Handle Google OAuth callback"""
    try:
        token = await oauth.google.authorize_access_token(request)
        user_info = token.get('userinfo')
        if not user_info:
            user_info = await oauth.google.parse_id_token(request, token)
        
        # Store user info in session
        request.session['user'] = dict(user_info)
        
        # Redirect to frontend callback
        return RedirectResponse(url=f"{FRONTEND_URL}/auth/callback?auth=success")
        
    except Exception as e:
        print(f"OAuth authorization error: {e}")
        return RedirectResponse(url=f"{FRONTEND_URL}/auth/callback?auth=error")

@router.get('/auth/user')
async def get_user(request: Request):
    """Get current user from session"""
    user = request.session.get('user')
    if user:
        return {"user": user, "authenticated": True}
    return {"user": None, "authenticated": False}

@router.post('/auth/logout')
async def logout(request: Request):
    """Logout user"""
    request.session.pop('user', None)
    return {"message": "Logged out successfully"}

@router.get('/auth/status')
async def auth_status(request: Request):
    """Check authentication status"""
    user = request.session.get('user')
    return {
        "authenticated": user is not None,
        "user": user
    }
