from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config.database import engine, Base
from app.routes import auth, projects, todos, billing

# Automatically create database tables on startup (especially for SQLite fallback)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Todo SaaS API",
    description="A complete API backend for a Todo SaaS application including authentication, folders/projects, active todo limits, and billing simulation.",
    version="1.0.0"
)

# Set up CORS middleware to allow calls from Next.js (and potential other origins)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development, allow all origins. Can be restricted to specific domains (e.g. localhost:3000) in production.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(auth.router, prefix="/api")
app.include_router(projects.router, prefix="/api")
app.include_router(todos.router, prefix="/api")
app.include_router(billing.router, prefix="/api")

@app.get("/")
def root():
    return {
        "status": "online",
        "message": "Todo SaaS API is running successfully. Access interactive docs at /docs."
    }