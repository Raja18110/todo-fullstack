from fastapi import FastAPI

app = FastAPI(title="Todo SaaS API")

@app.get("/")
def root():
    return {"message": "Backend running successfully"}