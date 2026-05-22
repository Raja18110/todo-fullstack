from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from app.dependencies.db import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.todo import Todo
from app.models.project import Project
from app.schemas.todo import TodoCreate, TodoUpdate, TodoResponse

router = APIRouter(prefix="/todos", tags=["todos"])

# Active todos limit for free users
FREE_TIER_TODO_LIMIT = 15

@router.get("", response_model=List[TodoResponse])
def list_todos(
    project_id: Optional[int] = None,
    is_completed: Optional[bool] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Todo).options(joinedload(Todo.project)).filter(Todo.user_id == current_user.id)
    
    if project_id is not None:
        query = query.filter(Todo.project_id == project_id)
        
    if is_completed is not None:
        query = query.filter(Todo.is_completed == is_completed)
        
    # Order by priority (high first, then medium, then low) and due date
    # Let's return the results and sort them in Python or database. Simple database order:
    return query.order_by(Todo.created_at.desc()).all()

@router.post("", response_model=TodoResponse, status_code=status.HTTP_201_CREATED)
def create_todo(todo_in: TodoCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Check limit for free tier (active/uncompleted tasks)
    if not current_user.is_premium:
        active_todo_count = db.query(Todo).filter(
            Todo.user_id == current_user.id,
            Todo.is_completed == False
        ).count()
        if active_todo_count >= FREE_TIER_TODO_LIMIT:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Free tier limit reached ({FREE_TIER_TODO_LIMIT} active tasks). Please complete/delete existing tasks or upgrade to Premium for unlimited tasks!"
            )
            
    # Verify project belongs to user if project_id is provided
    if todo_in.project_id is not None:
        project = db.query(Project).filter(
            Project.id == todo_in.project_id,
            Project.user_id == current_user.id
        ).first()
        if not project:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The specified project does not exist or you do not have permission to use it."
            )
            
    db_todo = Todo(
        title=todo_in.title,
        description=todo_in.description,
        priority=todo_in.priority or "medium",
        due_date=todo_in.due_date,
        project_id=todo_in.project_id,
        user_id=current_user.id,
        is_completed=False
    )
    db.add(db_todo)
    db.commit()
    db.refresh(db_todo)
    
    # Reload with project relationship
    return db.query(Todo).options(joinedload(Todo.project)).filter(Todo.id == db_todo.id).first()

@router.get("/{todo_id}", response_model=TodoResponse)
def get_todo(todo_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    todo = db.query(Todo).options(joinedload(Todo.project)).filter(
        Todo.id == todo_id,
        Todo.user_id == current_user.id
    ).first()
    if not todo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found or you do not have permission to view it."
        )
    return todo

@router.put("/{todo_id}", response_model=TodoResponse)
def update_todo(todo_id: int, todo_in: TodoUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    todo = db.query(Todo).options(joinedload(Todo.project)).filter(
        Todo.id == todo_id,
        Todo.user_id == current_user.id
    ).first()
    if not todo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found or you do not have permission to edit it."
        )
        
    # Verify project if changing it
    if todo_in.project_id is not None:
        project = db.query(Project).filter(
            Project.id == todo_in.project_id,
            Project.user_id == current_user.id
        ).first()
        if not project:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The specified project does not exist or you do not have permission to use it."
            )
            
    update_data = todo_in.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(todo, key, value)
        
    db.commit()
    db.refresh(todo)
    return todo

@router.delete("/{todo_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_todo(todo_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    todo = db.query(Todo).filter(
        Todo.id == todo_id,
        Todo.user_id == current_user.id
    ).first()
    if not todo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found or you do not have permission to delete it."
        )
        
    db.delete(todo)
    db.commit()
    return None
