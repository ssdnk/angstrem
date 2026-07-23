from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, engine
import app.models  # noqa: F401 — регистрируем все модели
from app.routers import auth, trainings, tests, dashboard, employee_portal, misc

Base.metadata.create_all(bind=engine)

app = FastAPI(title="ИС УКО АО НПО Ангстрем")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PREFIX = "/api/v1"
app.include_router(auth.router, prefix=PREFIX)
app.include_router(trainings.router, prefix=PREFIX)
app.include_router(tests.router, prefix=PREFIX)
app.include_router(dashboard.router, prefix=PREFIX)
app.include_router(employee_portal.router, prefix=PREFIX)
app.include_router(misc.router, prefix=PREFIX)
