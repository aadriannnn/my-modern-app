"""
Pydantic schemas for feedback API endpoints.
"""
from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime


class FeedbackSubmit(BaseModel):
    """Schema for submitting user feedback."""
    feedback_type: str = Field(..., description="Type of feedback: 'good' or 'bad'")
    speta_id: Optional[int] = Field(None, description="Optional ID of the speta being rated")

    @validator('feedback_type')
    def validate_feedback_type(cls, v):
        if v not in ['good', 'bad']:
            raise ValueError("feedback_type must be either 'good' or 'bad'")
        return v


class FeedbackResponse(BaseModel):
    """Response after submitting feedback."""
    success: bool
    message: str
    feedback_id: Optional[int] = None


class FeedbackStatsResponse(BaseModel):
    """Response containing feedback statistics."""
    total_feedback: int = Field(..., description="Total number of feedback entries")
    good_count: int = Field(..., description="Number of good ratings")
    bad_count: int = Field(..., description="Number of bad ratings")
    good_percentage: float = Field(..., description="Percentage of good ratings")
    bad_percentage: float = Field(..., description="Percentage of bad ratings")
