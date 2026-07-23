from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date
import io, csv
from fastapi.responses import StreamingResponse
from app.database import get_db
from app.core.deps import get_current_admin
from app.models.admin import Admin
from app.models.employee import Employee
from app.models.training import Training
from app.models.enrollment import Enrollment
from app.models.test_attempt import TestAttempt

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

TODAY = date.today


def training_status(start_date: str, end_date: str) -> str:
    today = date.today()
    s = date.fromisoformat(start_date)
    e = date.fromisoformat(end_date)
    if today < s:
        return "not_started"
    elif today > e:
        return "completed"
    else:
        return "in_progress"


def deadline_status(deadline_date: Optional[str]) -> str:
    if not deadline_date:
        return "no_deadline"
    today = date.today()
    d = date.fromisoformat(deadline_date)
    diff = (d - today).days
    if diff < 0:
        return "overdue"
    elif diff <= 2:
        return "soon"
    else:
        return "ok"


def build_row(enrollment: Enrollment) -> dict:
    emp = enrollment.employee
    tr = enrollment.training
    attempt = enrollment.attempt

    test_ready = tr.test is not None
    passing_score = tr.test.passing_score if tr.test else None

    if attempt and attempt.finished_at:
        if attempt.is_passed == 1:
            test_status = "passed"
        else:
            test_status = "failed"
        score = attempt.score
    else:
        test_status = "not_taken"
        score = None

    return {
        "enrollment_id": enrollment.id,
        "employee_id": emp.id,
        "last_name": emp.last_name,
        "first_name": emp.first_name,
        "department": emp.department,
        "training_id": tr.id,
        "training_title": tr.title,
        "duration_hours": tr.duration_hours,
        "start_date": tr.start_date,
        "end_date": tr.end_date,
        "training_status": training_status(tr.start_date, tr.end_date),
        "test_ready": test_ready,
        "test_status": test_status,
        "score": score,
        "passing_score": passing_score,
        "deadline_date": enrollment.deadline_date,
        "deadline_status": deadline_status(enrollment.deadline_date),
    }


@router.get("/table")
def dashboard_table(
    department: Optional[str] = Query(None),
    training_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    admin: Admin = Depends(get_current_admin),
):
    query = db.query(Enrollment)

    if department:
        query = query.join(Enrollment.employee).filter(Employee.department == department)
    if training_id:
        query = query.filter(Enrollment.training_id == training_id)
    if date_from or date_to:
        query = query.join(Enrollment.training) if not department else query
        if date_from:
            query = query.filter(Training.start_date >= date_from)
        if date_to:
            query = query.filter(Training.end_date <= date_to)
    if search:
        if not department:
            query = query.join(Enrollment.employee)
        query = query.filter(
            (Employee.last_name.ilike(f"%{search}%")) | (Employee.first_name.ilike(f"%{search}%"))
        )

    enrollments = query.all()
    rows = [build_row(e) for e in enrollments]

    if status and status != "all":
        rows = [r for r in rows if r["test_status"] == status]

    total = len(rows)
    start = (page - 1) * page_size
    paginated = rows[start: start + page_size]

    return {"total": total, "page": page, "page_size": page_size, "rows": paginated}


@router.get("/stats")
def dashboard_stats(db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    trainings = db.query(Training).all()
    enrollments = db.query(Enrollment).all()

    total_trainings = len(trainings)
    total_enrollments = len(enrollments)

    finished = [e for e in enrollments if e.attempt and e.attempt.finished_at]
    scores = [e.attempt.score for e in finished if e.attempt.score is not None]
    avg_score = round(sum(scores) / len(scores), 1) if scores else 0

    passed = [e for e in finished if e.attempt.is_passed == 1]
    pass_rate = round(len(passed) / total_enrollments * 100, 1) if total_enrollments else 0

    by_training = []
    for t in trainings:
        t_enrollments = t.enrollments
        t_finished = [e for e in t_enrollments if e.attempt and e.attempt.finished_at]
        t_scores = [e.attempt.score for e in t_finished if e.attempt.score is not None]
        t_passed = [e for e in t_finished if e.attempt.is_passed == 1]
        t_failed = [e for e in t_finished if e.attempt.is_passed == 0]
        t_not_taken = [e for e in t_enrollments if not (e.attempt and e.attempt.finished_at)]

        by_training.append({
            "training_id": t.id,
            "training_title": t.title,
            "avg_score": round(sum(t_scores) / len(t_scores), 1) if t_scores else None,
            "passing_score": t.test.passing_score if t.test else None,
            "total_enrolled": len(t_enrollments),
            "total_passed": len(t_passed),
            "total_failed": len(t_failed),
            "total_not_taken": len(t_not_taken),
        })

    return {
        "total_trainings": total_trainings,
        "total_enrollments": total_enrollments,
        "avg_score": avg_score,
        "pass_rate": pass_rate,
        "by_training": by_training,
    }


@router.get("/export")
def export_csv(
    department: Optional[str] = Query(None),
    training_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    admin: Admin = Depends(get_current_admin),
):
    query = db.query(Enrollment)
    if department:
        query = query.join(Enrollment.employee).filter(Employee.department == department)
    if training_id:
        query = query.filter(Enrollment.training_id == training_id)
    if search:
        if not department:
            query = query.join(Enrollment.employee)
        query = query.filter(
            (Employee.last_name.ilike(f"%{search}%")) | (Employee.first_name.ilike(f"%{search}%"))
        )

    enrollments = query.all()
    rows = [build_row(e) for e in enrollments]
    if status and status != "all":
        rows = [r for r in rows if r["test_status"] == status]

    STATUS_MAP = {"passed": "Пройден", "failed": "Не пройден", "not_taken": "Не проходил"}
    TRAINING_STATUS_MAP = {"completed": "Завершено", "in_progress": "В процессе", "not_started": "Не началось"}
    DEADLINE_MAP = {"overdue": "Просрочен", "soon": "Скоро истекает", "ok": "В норме", "no_deadline": "—"}

    output = io.StringIO()
    output.write("﻿")
    writer = csv.writer(output, delimiter=";")
    writer.writerow([
        "№", "Фамилия", "Имя", "Подразделение", "Обучение", "Длительность (ч)",
        "Дата начала", "Дата окончания", "Статус обучения", "Тест готов",
        "Результат теста", "Оценка (%)", "Дедлайн теста", "Статус дедлайна",
    ])
    for i, r in enumerate(rows, 1):
        writer.writerow([
            i,
            r["last_name"], r["first_name"], r["department"],
            r["training_title"], r["duration_hours"],
            r["start_date"], r["end_date"],
            TRAINING_STATUS_MAP.get(r["training_status"], ""),
            "Да" if r["test_ready"] else "Нет",
            STATUS_MAP.get(r["test_status"], ""),
            r["score"] if r["score"] is not None else "—",
            r["deadline_date"] or "—",
            DEADLINE_MAP.get(r["deadline_status"], ""),
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue().encode("utf-8-sig")]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=report.csv"},
    )
