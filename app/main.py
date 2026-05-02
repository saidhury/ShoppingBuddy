import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.api.endpoints import router
from app.core.config import get_settings
from app.core.rate_limit import limiter
from app.db.database import close_db, init_db
from app.services.data_loader import load_and_preprocess_data


settings = get_settings()
app = FastAPI(title="Shopping Buddy")

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="public"), name="static")
app.include_router(router)


@app.on_event("startup")
async def on_startup() -> None:
    app.state.gemini_key_configured = bool(settings.google_api_key)
    customer_map, product_map = load_and_preprocess_data(settings)
    app.state.customer_map = customer_map
    app.state.product_map = product_map
    await init_db(Path(settings.db_name))


@app.on_event("shutdown")
async def on_shutdown() -> None:
    await close_db()
