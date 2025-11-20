from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any
from ..settings_manager import settings_manager
from ..routers.auth import get_current_user

router = APIRouter(
    prefix="/settings",
    tags=["settings"],
    responses={404: {"description": "Not found"}},
)

@router.get("/", response_model=Dict[str, Any])
async def get_settings(current_user: str = Depends(get_current_user)):
    """
    Get all current settings.
    Requires authentication.
    """
    return settings_manager.get_settings()

@router.put("/", response_model=Dict[str, Any])
async def update_settings(new_settings: Dict[str, Any], current_user: str = Depends(get_current_user)):
    """
    Update settings.
    Requires authentication.
    """
    try:
        settings_manager.save_settings(new_settings)
        return settings_manager.get_settings()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/reset", response_model=Dict[str, Any])
async def reset_settings(current_user: str = Depends(get_current_user)):
    """
    Reset settings to defaults.
    Requires authentication.
    """
    try:
        settings_manager.reset_to_defaults()
        return settings_manager.get_settings()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
