from pydantic import BaseModel
from typing import Optional, List


class AnswerOptionCreate(BaseModel):
    answer_text: str
    is_correct: bool
    order_index: int


class QuestionCreate(BaseModel):
    question_text: str
    question_type: str
    order_index: int
    answer_options: List[AnswerOptionCreate]


class QuestionUpdate(BaseModel):
    question_text: Optional[str] = None
    question_type: Optional[str] = None
    order_index: Optional[int] = None
    answer_options: Optional[List[AnswerOptionCreate]] = None


class TestCreate(BaseModel):
    training_id: int
    title: str
    time_limit_minutes: int = 30
    deadline_days: int = 5
    passing_score: int = 70
    is_active: bool = True


class TestUpdate(BaseModel):
    title: Optional[str] = None
    time_limit_minutes: Optional[int] = None
    deadline_days: Optional[int] = None
    passing_score: Optional[int] = None
    is_active: Optional[bool] = None
