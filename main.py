import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from app.api.routes import router
from app.core import settings
from app.memory.database import init_database
from app.services.alarm_checker import alarm_check_loop
from app.services.reminder_checker import reminder_check_loop
from app.websocket.manager import event_broadcaster


@asynccontextmanager
async def lifespan(application: FastAPI):
    init_database()
    tasks = [
        asyncio.create_task(event_broadcaster()),
        asyncio.create_task(reminder_check_loop()),
        asyncio.create_task(alarm_check_loop()),
    ]
    yield
    for t in tasks:
        t.cancel()


app = FastAPI(
    title="JARVIS CORE",
    version="2.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.JARVIS_CORS_ORIGINS or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


if __name__ == "__main__":

    print("")
    print("===================================")
    print("        JARVIS CORE v2.0")
    print("   AI Operating System Online")
    print("===================================")
    print("")
    print(f"  Server:  http://{settings.APP_HOST}:{settings.APP_PORT}")
    print(f"  LLM:     {settings.OLLAMA_MODEL} @ {settings.OLLAMA_BASE_URL}")
    print(f"  Voice:   {'Enabled' if settings.VOICE_ENABLED else 'Disabled'}")
    print(f"  Docs:    http://{settings.APP_HOST}:{settings.APP_PORT}/docs")
    print("")

    uvicorn.run(
        "main:app",
        host=settings.APP_HOST,
        port=settings.APP_PORT,
        reload=settings.APP_RELOAD,
    )
