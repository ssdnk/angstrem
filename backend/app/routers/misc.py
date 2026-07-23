from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.employee import Employee

router = APIRouter(tags=["misc"])


@router.get("/departments")
def list_departments(db: Session = Depends(get_db)):
    rows = db.query(Employee.department).distinct().all()
    return sorted([r[0] for r in rows])
