from pydantic import BaseModel
from datetime import datetime, date
from typing import Optional
from app.schemas.project import ProjectResponse

class TodoBase(BaseModel):
    title: str
    description: Optional[str] = None
    priority: Optional[str] = "medium"  # low, medium, high
    due_date: Optional[date] = None
    project_id: Optional[int] = None

class TodoCreate(TodoBase):
    pass

class TodoUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[date] = None
    project_id: Optional[int] = None
    is_completed: Optional[bool] = None

class TodoResponse(TodoBase):
    id: int
    user_id: int
    is_completed: bool
    created_at: datetime
    project: Optional[ProjectResponse] = None

    class Config:
        from_attributes = True
