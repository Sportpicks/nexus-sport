from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import settings
from backend.database import init_db
from backend.services.scheduler import create_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    scheduler = create_scheduler()
    scheduler.start()
    yield
    scheduler.shutdown(wait=False)


app = FastAPI(
    title=settings.APP_NAME,
    debug=settings.DEBUG,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

try:
    from backend.routers import matches
    app.include_router(matches.router, prefix="/matches", tags=["matches"])
except ImportError:
    pass

try:
    from backend.routers import payments
    app.include_router(payments.router, prefix="/payments", tags=["payments"])
except ImportError:
    pass

try:
    from backend.routers import predictions
    app.include_router(predictions.router, prefix="/predictions", tags=["predictions"])
except ImportError:
    pass

try:
    from backend.routers import admin
    app.include_router(admin.router)
except ImportError:
    pass


@app.get("/")
async def health_check():
    return {"status": "ok", "app": settings.APP_NAME}
