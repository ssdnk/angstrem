from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, date
from app.database import get_db
from app.core.deps import get_current_employee
from app.models.employee import Employee
from app.models.enrollment import Enrollment
from app.models.test import Test
from app.models.test_attempt import TestAttempt
from app.models.attempt_answer import AttemptAnswer
from app.models.question import Question
from app.schemas.employee_portal import SubmitTestRequest
from app.services.test_service import calc_score

router = APIRouter(prefix="/employee", tags=["employee"])


def get_test_status(enrollment: Enrollment) -> str:
    attempt = enrollment.attempt
    today = date.today().isoformat()

    if attempt and attempt.finished_at:
        if attempt.is_passed == 1:
            return "passed"
        else:
            return "failed"

    if enrollment.deadline_date and enrollment.deadline_date < today:
        return "expired"

    return "available"


@router.get("/tests")
def list_employee_tests(
    db: Session = Depends(get_db),
    employee: Employee = Depends(get_current_employee),
):
    result = []
    for enrollment in employee.enrollments:
        training = enrollment.training
        test = training.test
        if not test or not test.is_active:
            continue

        attempt = enrollment.attempt
        st = get_test_status(enrollment)

        result.append({
            "enrollment_id": enrollment.id,
            "test_id": test.id,
            "test_title": test.title,
            "training_title": training.title,
            "time_limit_minutes": test.time_limit_minutes,
            "passing_score": test.passing_score,
            "deadline_date": enrollment.deadline_date,
            "status": st,
            "score": attempt.score if attempt and attempt.finished_at else None,
        })
    return result


@router.get("/tests/{test_id}/start")
def start_test(
    test_id: int,
    db: Session = Depends(get_db),
    employee: Employee = Depends(get_current_employee),
):
    test = db.query(Test).filter(Test.id == test_id, Test.is_active == 1).first()
    if not test:
        raise HTTPException(status_code=404, detail="Тест не найден")

    enrollment = db.query(Enrollment).filter(
        Enrollment.employee_id == employee.id,
        Enrollment.training_id == test.training_id,
    ).first()
    if not enrollment:
        raise HTTPException(status_code=403, detail="Нет доступа к этому тесту")

    today = date.today().isoformat()
    if enrollment.deadline_date and enrollment.deadline_date < today:
        raise HTTPException(status_code=403, detail="Дедлайн прохождения истёк")

    if enrollment.attempt and enrollment.attempt.finished_at:
        raise HTTPException(status_code=409, detail="Тест уже пройден")

    attempt = enrollment.attempt
    if not attempt:
        attempt = TestAttempt(
            enrollment_id=enrollment.id,
            started_at=datetime.utcnow().isoformat(),
        )
        db.add(attempt)
        db.commit()
        db.refresh(attempt)

    questions = [
        {
            "id": q.id,
            "question_text": q.question_text,
            "question_type": q.question_type,
            "order_index": q.order_index,
            "answer_options": [
                {"id": opt.id, "answer_text": opt.answer_text, "order_index": opt.order_index}
                for opt in q.answer_options
            ],
        }
        for q in test.questions
    ]

    return {
        "attempt_id": attempt.id,
        "test_title": test.title,
        "time_limit_minutes": test.time_limit_minutes,
        "passing_score": test.passing_score,
        "started_at": attempt.started_at,
        "questions": questions,
    }


@router.post("/tests/{test_id}/submit")
def submit_test(
    test_id: int,
    body: SubmitTestRequest,
    db: Session = Depends(get_db),
    employee: Employee = Depends(get_current_employee),
):
    test = db.query(Test).filter(Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Тест не найден")

    enrollment = db.query(Enrollment).filter(
        Enrollment.employee_id == employee.id,
        Enrollment.training_id == test.training_id,
    ).first()
    if not enrollment:
        raise HTTPException(status_code=403, detail="Нет доступа")

    attempt = db.query(TestAttempt).filter(
        TestAttempt.id == body.attempt_id,
        TestAttempt.enrollment_id == enrollment.id,
    ).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Попытка не найдена")
    if attempt.finished_at:
        raise HTTPException(status_code=409, detail="Тест уже завершён")

    for ans in body.answers:
        for opt_id in ans.selected_option_ids:
            aa = AttemptAnswer(
                attempt_id=attempt.id,
                question_id=ans.question_id,
                answer_option_id=opt_id,
            )
            db.add(aa)

    db.flush()
    db.refresh(attempt)

    score, correct_count, total = calc_score(test.questions, attempt.answers)
    is_passed = 1 if score >= test.passing_score else 0

    finished_at = datetime.utcnow()
    started_at = datetime.fromisoformat(attempt.started_at)
    time_spent = int((finished_at - started_at).total_seconds())

    attempt.finished_at = finished_at.isoformat()
    attempt.score = score
    attempt.is_passed = is_passed
    attempt.time_spent_seconds = time_spent

    db.commit()

    question_results = []
    from collections import defaultdict
    selected_by_q = defaultdict(set)
    for aa in attempt.answers:
        selected_by_q[aa.question_id].add(aa.answer_option_id)

    for q in test.questions:
        correct_ids = [opt.id for opt in q.answer_options if opt.is_correct]
        selected_ids = list(selected_by_q.get(q.id, set()))
        question_results.append({
            "question_id": q.id,
            "question_text": q.question_text,
            "is_correct": set(selected_ids) == set(correct_ids),
            "selected_option_ids": selected_ids,
            "correct_option_ids": correct_ids,
            "answer_options": [
                {"id": opt.id, "answer_text": opt.answer_text, "is_correct": bool(opt.is_correct)}
                for opt in q.answer_options
            ],
        })

    return {
        "score": score,
        "is_passed": bool(is_passed),
        "passing_score": test.passing_score,
        "correct_count": correct_count,
        "total_questions": total,
        "time_spent_seconds": time_spent,
        "question_results": question_results,
    }


@router.get("/tests/{test_id}/result")
def get_result(
    test_id: int,
    db: Session = Depends(get_db),
    employee: Employee = Depends(get_current_employee),
):
    test = db.query(Test).filter(Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Тест не найден")

    enrollment = db.query(Enrollment).filter(
        Enrollment.employee_id == employee.id,
        Enrollment.training_id == test.training_id,
    ).first()
    if not enrollment or not enrollment.attempt or not enrollment.attempt.finished_at:
        raise HTTPException(status_code=404, detail="Результат не найден")

    attempt = enrollment.attempt
    from collections import defaultdict
    selected_by_q = defaultdict(set)
    for aa in attempt.answers:
        selected_by_q[aa.question_id].add(aa.answer_option_id)

    question_results = []
    for q in test.questions:
        correct_ids = [opt.id for opt in q.answer_options if opt.is_correct]
        selected_ids = list(selected_by_q.get(q.id, set()))
        question_results.append({
            "question_id": q.id,
            "question_text": q.question_text,
            "is_correct": set(selected_ids) == set(correct_ids),
            "selected_option_ids": selected_ids,
            "correct_option_ids": correct_ids,
            "answer_options": [
                {"id": opt.id, "answer_text": opt.answer_text, "is_correct": bool(opt.is_correct)}
                for opt in q.answer_options
            ],
        })

    return {
        "score": attempt.score,
        "is_passed": bool(attempt.is_passed),
        "passing_score": test.passing_score,
        "correct_count": sum(1 for r in question_results if r["is_correct"]),
        "total_questions": len(test.questions),
        "time_spent_seconds": attempt.time_spent_seconds,
        "question_results": question_results,
    }
