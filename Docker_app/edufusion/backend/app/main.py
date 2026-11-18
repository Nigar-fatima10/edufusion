from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import textwrap
import time
import zipfile
from typing import Dict, Optional
from uuid import uuid4

import httpx
from docx import Document
from docx.opc.exceptions import PackageNotFoundError as WordPackageNotFoundError
from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from lxml.etree import XMLSyntaxError
from pydantic import BaseModel, Field
from pypdf import PdfReader
from pypdf.errors import PdfReadError
from pptx import Presentation
from pptx.exc import PackageNotFoundError as PowerPointPackageNotFoundError

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
MATERIALS_FILE = UPLOAD_DIR / ".materials.json"

app = FastAPI(title="EduFusion API", version="1.0.0")


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    detail = exc.detail
    if isinstance(detail, dict) and "message" in detail:
        message = detail["message"]
    elif isinstance(detail, str):
        message = detail
    else:
        message = "Request failed."
    return JSONResponse(status_code=exc.status_code, content={"message": message})


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(status_code=422, content={"message": "Request validation failed."})


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

users: Dict[str, dict] = {}


class AuthPayload(BaseModel):
    name: str
    email: str
    password: str


class UserResponse(BaseModel):
    name: str
    email: str


class AuthResponse(BaseModel):
    token: str
    user: UserResponse


class UploadResponse(BaseModel):
    message: str
    filename: str
    size: int
    storage_path: str


class MaterialResponse(BaseModel):
    id: str
    name: str
    size: int


class SummaryRequest(BaseModel):
    material_id: Optional[str] = None
    text: Optional[str] = Field(default=None, max_length=250_000)
    length: str = "medium"


class SummaryResponse(BaseModel):
    summary: str
    length: str
    source_name: str
    route: str
    model: str
    duration_ms: int


SUMMARY_MAX_CHARS = 250_000
SUMMARY_CHUNK_CHARS = 9_000
SUMMARY_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:1b")
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://ai-service:11434")


def _hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def _make_token(email: str) -> str:
    return f"edufusion-{uuid4().hex}"


def _load_materials() -> Dict[str, dict]:
    if not MATERIALS_FILE.exists():
        return {}
    try:
        data = json.loads(MATERIALS_FILE.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except (json.JSONDecodeError, OSError):
        return {}


def _save_materials(materials: Dict[str, dict]) -> None:
    MATERIALS_FILE.write_text(
        json.dumps(materials, ensure_ascii=False),
        encoding="utf-8",
    )


materials = _load_materials()


def _extract_material_text(material: dict) -> str:
    path = Path(material["storage_path"]).resolve()
    if UPLOAD_DIR.resolve() not in path.parents or not path.is_file():
        raise HTTPException(status_code=404, detail={"message": "The selected material could not be found."})
    if path.stat().st_size > 25 * 1024 * 1024:
        raise HTTPException(status_code=413, detail={"message": "Materials larger than 25 MB cannot be summarized."})

    extension = path.suffix.lower()
    try:
        if extension == ".pdf":
            text = "\n".join(page.extract_text() or "" for page in PdfReader(path).pages)
        elif extension == ".docx":
            text = "\n".join(paragraph.text for paragraph in Document(path).paragraphs)
        elif extension == ".pptx":
            presentation = Presentation(path)
            text = "\n".join(
                shape.text
                for slide in presentation.slides
                for shape in slide.shapes
                if getattr(shape, "has_text_frame", False)
            )
        elif extension in {
            ".txt", ".md", ".csv", ".json", ".py", ".js", ".ts", ".tsx",
            ".java", ".cs", ".cpp", ".c",
        }:
            text = path.read_text(encoding="utf-8-sig")
        else:
            raise HTTPException(
                status_code=422,
                detail={"message": "This file type cannot be read for summarization. Paste its transcript or text instead."},
            )
    except HTTPException:
        raise
    except (
        OSError,
        UnicodeDecodeError,
        ValueError,
        PdfReadError,
        WordPackageNotFoundError,
        PowerPointPackageNotFoundError,
        XMLSyntaxError,
        zipfile.BadZipFile,
    ) as exc:
        raise HTTPException(
            status_code=422,
            detail={"message": "The selected material is unreadable or damaged."},
        ) from exc

    if not text.strip():
        raise HTTPException(
            status_code=422,
            detail={"message": "No readable text was found. Scanned PDFs and media need a text transcript."},
        )
    if len(text) > SUMMARY_MAX_CHARS:
        raise HTTPException(
            status_code=413,
            detail={"message": "The extracted material is too long to summarize (maximum 250,000 characters)."},
        )
    return text


def _split_text(text: str) -> list[str]:
    return textwrap.wrap(
        text,
        width=SUMMARY_CHUNK_CHARS,
        break_long_words=True,
        break_on_hyphens=False,
        replace_whitespace=False,
        drop_whitespace=True,
    )


def _summary_prompt(text: str, length: str, combine: bool = False) -> str:
    if combine:
        task = (
            "Combine these partial summaries into one coherent summary. Remove repetition, "
            "preserve important facts, and do not add information absent from the source."
        )
    else:
        task = "Summarize the source accurately. Do not add information that is not in the source."

    style = {
        "short": "Keep it concise: one short paragraph followed by up to 3 key points.",
        "medium": "Write a clear overview followed by the main ideas as concise bullet points.",
        "detailed": "Use a descriptive title, section headings, detailed bullet points, and a short list of key terms.",
    }[length]
    return f"{task}\nSummary style: {style}\n\nSOURCE:\n{text}"


async def _ollama_generate(prompt: str) -> str:
    try:
        async with httpx.AsyncClient(timeout=180) as client:
            response = await client.post(
                f"{OLLAMA_URL.rstrip('/')}/api/generate",
                json={"model": SUMMARY_MODEL, "prompt": prompt, "stream": False},
            )
            response.raise_for_status()
    except httpx.ConnectError as exc:
        raise HTTPException(
            status_code=503,
            detail={"message": "The local AI model is not ready yet. Wait for its download to finish, then try again."},
        ) from exc
    except httpx.TimeoutException as exc:
        raise HTTPException(
            status_code=504,
            detail={"message": "The local AI model took too long to respond. Try a shorter source."},
        ) from exc
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=502,
            detail={"message": "The local AI model could not process this request."},
        ) from exc

    try:
        result = response.json().get("response")
    except (ValueError, AttributeError) as exc:
        raise HTTPException(
            status_code=502,
            detail={"message": "The local AI model returned an invalid response."},
        ) from exc
    if not isinstance(result, str) or not result.strip():
        raise HTTPException(
            status_code=502,
            detail={"message": "The local AI model returned an empty summary."},
        )
    return result.strip()


@app.get("/")
@app.get("/health")
@app.get("/api/health")
def health_check() -> dict:
    return {"status": "ok", "service": "edufusion-backend"}


@app.post("/api/auth/register", response_model=AuthResponse)
def register_user(payload: AuthPayload):
    email = payload.email.lower()
    if email in users:
        raise HTTPException(status_code=409, detail={"message": "An account with this email already exists."})

    stored_user = {
        "name": payload.name.strip(),
        "email": email,
        "password_hash": _hash_password(payload.password),
    }
    users[email] = stored_user

    token = _make_token(email)
    return AuthResponse(token=token, user=UserResponse(name=stored_user["name"], email=stored_user["email"]))


@app.post("/api/auth/login", response_model=AuthResponse)
def login_user(payload: AuthPayload):
    email = payload.email.lower()
    user = users.get(email)
    if not user:
        raise HTTPException(status_code=401, detail={"message": "No account was found for that email."})

    if user["password_hash"] != _hash_password(payload.password):
        raise HTTPException(status_code=401, detail={"message": "The password is incorrect."})

    token = _make_token(email)
    return AuthResponse(token=token, user=UserResponse(name=user["name"], email=user["email"]))


@app.post("/api/upload", response_model=UploadResponse)
async def upload_file(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail={"message": "No file selected."})

    allowed_extensions = {
        ".pdf",
        ".doc",
        ".docx",
        ".ppt",
        ".pptx",
        ".txt",
        ".md",
        ".png",
        ".jpg",
        ".jpeg",
        ".gif",
        ".webp",
        ".mp3",
        ".wav",
        ".mp4",
        ".mov",
        ".avi",
        ".py",
        ".js",
        ".ts",
        ".tsx",
        ".java",
        ".cs",
        ".cpp",
        ".c",
        ".json",
        ".csv",
    }
    file_extension = Path(file.filename).suffix.lower()
    if file_extension not in allowed_extensions:
        raise HTTPException(status_code=400, detail={"message": "This file type is not supported."})

    content = await file.read()
    if len(content) > 250 * 1024 * 1024:
        raise HTTPException(status_code=413, detail={"message": "File is larger than 250 MB."})

    file_id = uuid4().hex
    stored_name = f"{file_id}{file_extension}"
    storage_path = UPLOAD_DIR / stored_name
    storage_path.write_bytes(content)
    materials[file_id] = {
        "id": file_id,
        "name": file.filename,
        "size": len(content),
        "storage_path": str(storage_path),
    }
    _save_materials(materials)

    return UploadResponse(
        message="Upload completed successfully.",
        filename=file.filename,
        size=len(content),
        storage_path=str(storage_path),
    )


@app.get("/api/materials", response_model=list[MaterialResponse])
def list_materials(q: Optional[str] = None):
    query = (q or "").strip().lower()
    results = [
        MaterialResponse(id=item["id"], name=item["name"], size=item["size"])
        for item in sorted(materials.values(), key=lambda item: item["name"].lower())
        if not query or query in item["name"].lower()
    ]
    return results


@app.post("/api/summarize", response_model=SummaryResponse)
async def summarize_material(request: SummaryRequest):
    if request.length not in {"short", "medium", "detailed"}:
        raise HTTPException(status_code=422, detail={"message": "Choose a short, medium, or detailed summary."})
    if bool(request.material_id) == bool(request.text and request.text.strip()):
        raise HTTPException(
            status_code=422,
            detail={"message": "Choose one uploaded material or enter text to summarize."},
        )

    if request.material_id:
        material = materials.get(request.material_id)
        if not material:
            raise HTTPException(status_code=404, detail={"message": "The selected material could not be found."})
        source_text = _extract_material_text(material)
        source_name = material["name"]
    else:
        source_text = (request.text or "").strip()
        source_name = "Pasted text"
        if not source_text:
            raise HTTPException(status_code=422, detail={"message": "Enter text to summarize."})
        if len(source_text) > SUMMARY_MAX_CHARS:
            raise HTTPException(
                status_code=413,
                detail={"message": "Text is too long to summarize (maximum 250,000 characters)."},
            )

    started_at = time.perf_counter()
    chunks = _split_text(source_text)
    if len(chunks) == 1:
        summary = await _ollama_generate(_summary_prompt(chunks[0], request.length))
    else:
        partials = []
        for chunk in chunks:
            partials.append(await _ollama_generate(_summary_prompt(chunk, "medium")))
        summary = await _ollama_generate(_summary_prompt("\n\n".join(partials), request.length, combine=True))

    return SummaryResponse(
        summary=summary,
        length=request.length,
        source_name=source_name,
        route="local",
        model=SUMMARY_MODEL,
        duration_ms=round((time.perf_counter() - started_at) * 1000),
    )
