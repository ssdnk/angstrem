from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.deps import get_current_admin
from app.models.admin import Admin
from app.models.employee import Employee
from app.models.training import Training
from app.models.enrollment import Enrollment
from app.models.test_attempt import TestAttempt
from app.schemas.training import TrainingCreate, TrainingUpdate, EnrollEmployeeRequest
from app.services.test_service import calc_deadline
from datetime import datetime, date

router = APIRouter(prefix="/trainings", tags=["trainings"])


def training_to_dict(t: Training) -> dict:
    passed = sum(
        1 for e in t.enrollments
        if e.attempt and e.attempt.is_passed == 1
    )
    return {
        "id": t.id,
        "title": t.title,
        "provider": t.provider,
        "training_type": t.training_type,
        "start_date": t.start_date,
        "end_date": t.end_date,
        "duration_hours": t.duration_hours,
        "description": t.description,
        "has_test": t.test is not None,
        "employees_count": len(t.enrollments),
        "passed_count": passed,
    }


@router.get("")
def list_trainings(db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    trainings = db.query(Training).all()
    return [training_to_dict(t) for t in trainings]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_training(body: TrainingCreate, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    t = Training(
        title=body.title,
        provider=body.provider,
        training_type=body.training_type,
        start_date=body.start_date,
        end_date=body.end_date,
        duration_hours=body.duration_hours,
        description=body.description,
        created_at=datetime.utcnow().isoformat(),
        created_by=admin.id,
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return training_to_dict(t)


@router.get("/{training_id}")
def get_training(training_id: int, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    t = db.query(Training).filter(Training.id == training_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Обучение не найдено")
    return training_to_dict(t)


@router.put("/{training_id}")
def update_training(training_id: int, body: TrainingUpdate, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    t = db.query(Training).filter(Training.id == training_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Обучение не найдено")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(t, field, value)
    db.commit()
    db.refresh(t)
    return training_to_dict(t)


@router.delete("/{training_id}")
def delete_training(training_id: int, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    t = db.query(Training).filter(Training.id == training_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Обучение не найдено")

    has_results = any(e.attempt and e.attempt.finished_at for e in t.enrollments)
    if has_results:
        raise HTTPException(status_code=409, detail="Нельзя удалить обучение с результатами тестирований")

    db.delete(t)
    db.commit()
    return {"message": "Удалено"}


@router.get("/{training_id}/employees")
def get_training_employees(training_id: int, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    t = db.query(Training).filter(Training.id == training_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Обучение не найдено")

    result = []
    for e in t.enrollments:
        emp = e.employee
        attempt = e.attempt
        result.append({
            "enrollment_id": e.id,
            "employee_id": emp.id,
            "last_name": emp.last_name,
            "first_name": emp.first_name,
            "department": emp.department,
            "enrolled_at": e.enrolled_at,
            "deadline_date": e.deadline_date,
            "score": attempt.score if attempt else None,
            "is_passed": attempt.is_passed if attempt else None,
        })
    return result


@router.post("/{training_id}/employees", status_code=status.HTTP_201_CREATED)
def enroll_employee(training_id: int, body: EnrollEmployeeRequest, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    t = db.query(Training).filter(Training.id == training_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Обучение не найдено")

    employee = (
        db.query(Employee)
        .filter(
            Employee.last_name == body.last_name,
            Employee.first_name == body.first_name,
            Employee.department == body.department,
        )
        .first()
    )
    if not employee:
        employee = Employee(
            last_name=body.last_name,
            first_name=body.first_name,
            department=body.department,
            created_at=datetime.utcnow().isoformat(),
        )
        db.add(employee)
        db.flush()

    existing = db.query(Enrollment).filter(
        Enrollment.employee_id == employee.id,
        Enrollment.training_id == training_id,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Сотрудник уже добавлен в это обучение")

    deadline = None
    if t.test:
        deadline = calc_deadline(date.today(), t.test.deadline_days)

    enrollment = Enrollment(
        employee_id=employee.id,
        training_id=training_id,
        enrolled_at=datetime.utcnow().isoformat(),
        deadline_date=deadline,
    )
    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)

    return {
        "enrollment_id": enrollment.id,
        "employee_id": employee.id,
        "last_name": employee.last_name,
        "first_name": employee.first_name,
        "department": employee.department,
        "deadline_date": enrollment.deadline_date,
    }


@router.delete("/{training_id}/employees/{enrollment_id}")
def remove_employee(training_id: int, enrollment_id: int, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    enrollment = db.query(Enrollment).filter(
        Enrollment.id == enrollment_id,
        Enrollment.training_id == training_id,
    ).first()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Запись не найдена")
    if enrollment.attempt and enrollment.attempt.finished_at:
        raise HTTPException(status_code=409, detail="Нельзя удалить сотрудника с завершённым тестом")
    db.delete(enrollment)
    db.commit()
    return {"message": "Удалено"}
