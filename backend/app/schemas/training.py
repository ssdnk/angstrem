from pydantic import BaseModel
from typing import Optional


class TrainingCreate(BaseModel):
    title: str
    provider: str
    training_type: str
    start_date: str
    end_date: str
    duration_hours: float
    description: Optional[str] = None


class TrainingUpdate(BaseModel):
    title: Optional[str] = None
    provider: Optional[str] = None
    training_type: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    duration_hours: Optional[float] = None
    description: Optional[str] = None


class EnrollEmployeeRequest(BaseModel):
    last_name: str
    first_name: str
    department: str
