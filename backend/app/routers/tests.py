from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from app.database import get_db
from app.core.deps import get_current_admin
from app.models.admin import Admin
from app.models.test import Test
from app.models.question import Question
from app.models.answer_option import AnswerOption
from app.models.training import Training
from app.schemas.test import TestCreate, TestUpdate, QuestionCreate, QuestionUpdate

router = APIRouter(prefix="/tests", tags=["tests"])


def test_to_dict(t: Test, include_questions=False) -> dict:
    d = {
        "id": t.id,
        "training_id": t.training_id,
        "title": t.title,
        "time_limit_minutes": t.time_limit_minutes,
        "deadline_days": t.deadline_days,
        "passing_score": t.passing_score,
        "is_active": bool(t.is_active),
        "created_at": t.created_at,
    }
    if include_questions:
        d["questions"] = [
            {
                "id": q.id,
                "question_text": q.question_text,
                "question_type": q.question_type,
                "order_index": q.order_index,
                "answer_options": [
                    {
                        "id": opt.id,
                        "answer_text": opt.answer_text,
                        "is_correct": bool(opt.is_correct),
                        "order_index": opt.order_index,
                    }
                    for opt in q.answer_options
                ],
            }
            for q in t.questions
        ]
    return d


@router.get("")
def list_tests(db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    tests = db.query(Test).all()
    return [test_to_dict(t) for t in tests]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_test(body: TestCreate, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    training = db.query(Training).filter(Training.id == body.training_id).first()
    if not training:
        raise HTTPException(status_code=404, detail="Обучение не найдено")
    if training.test:
        raise HTTPException(status_code=409, detail="К этому обучению уже привязан тест")

    t = Test(
        training_id=body.training_id,
        title=body.title,
        time_limit_minutes=body.time_limit_minutes,
        deadline_days=body.deadline_days,
        passing_score=body.passing_score,
        is_active=1 if body.is_active else 0,
        created_at=datetime.utcnow().isoformat(),
        created_by=admin.id,
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return test_to_dict(t, include_questions=True)


@router.get("/{test_id}")
def get_test(test_id: int, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    t = db.query(Test).filter(Test.id == test_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Тест не найден")
    return test_to_dict(t, include_questions=True)


@router.put("/{test_id}")
def update_test(test_id: int, body: TestUpdate, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    t = db.query(Test).filter(Test.id == test_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Тест не найден")
    data = body.model_dump(exclude_none=True)
    if "is_active" in data:
        data["is_active"] = 1 if data["is_active"] else 0
    for field, value in data.items():
        setattr(t, field, value)
    db.commit()
    db.refresh(t)
    return test_to_dict(t, include_questions=True)


@router.delete("/{test_id}")
def delete_test(test_id: int, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    t = db.query(Test).filter(Test.id == test_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Тест не найден")
    db.delete(t)
    db.commit()
    return {"message": "Удалено"}


@router.post("/{test_id}/questions", status_code=status.HTTP_201_CREATED)
def add_question(test_id: int, body: QuestionCreate, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    t = db.query(Test).filter(Test.id == test_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Тест не найден")

    q = Question(
        test_id=test_id,
        question_text=body.question_text,
        question_type=body.question_type,
        order_index=body.order_index,
    )
    db.add(q)
    db.flush()

    for opt in body.answer_options:
        ao = AnswerOption(
            question_id=q.id,
            answer_text=opt.answer_text,
            is_correct=1 if opt.is_correct else 0,
            order_index=opt.order_index,
        )
        db.add(ao)

    db.commit()
    db.refresh(q)
    return {
        "id": q.id,
        "question_text": q.question_text,
        "question_type": q.question_type,
        "order_index": q.order_index,
        "answer_options": [
            {"id": o.id, "answer_text": o.answer_text, "is_correct": bool(o.is_correct), "order_index": o.order_index}
            for o in q.answer_options
        ],
    }


@router.put("/{test_id}/questions/{question_id}")
def update_question(test_id: int, question_id: int, body: QuestionUpdate, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    q = db.query(Question).filter(Question.id == question_id, Question.test_id == test_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Вопрос не найден")

    if body.question_text is not None:
        q.question_text = body.question_text
    if body.question_type is not None:
        q.question_type = body.question_type
    if body.order_index is not None:
        q.order_index = body.order_index

    if body.answer_options is not None:
        for opt in q.answer_options:
            db.delete(opt)
        db.flush()
        for opt in body.answer_options:
            ao = AnswerOption(
                question_id=q.id,
                answer_text=opt.answer_text,
                is_correct=1 if opt.is_correct else 0,
                order_index=opt.order_index,
            )
            db.add(ao)

    db.commit()
    db.refresh(q)
    return {
        "id": q.id,
        "question_text": q.question_text,
        "question_type": q.question_type,
        "order_index": q.order_index,
        "answer_options": [
            {"id": o.id, "answer_text": o.answer_text, "is_correct": bool(o.is_correct), "order_index": o.order_index}
            for o in q.answer_options
        ],
    }


@router.delete("/{test_id}/questions/{question_id}")
def delete_question(test_id: int, question_id: int, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    q = db.query(Question).filter(Question.id == question_id, Question.test_id == test_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Вопрос не найден")
    db.delete(q)
    db.commit()
    return {"message": "Удалено"}
