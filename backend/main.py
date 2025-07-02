from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from rag_pipeline import run_query
import shutil
import os

app = FastAPI()

# Allow frontend local dev CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.post("/query")
async def query_api(
    query: str = Form(...),
    model: str = Form(...),
    file: UploadFile = File(None)
):
    uploaded_file_path = None

    if file:
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        uploaded_file_path = file_path

    answer = run_query(query, model, uploaded_file_path)
    return {"answer": answer}
