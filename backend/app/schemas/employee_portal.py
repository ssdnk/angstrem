from pydantic import BaseModel
from typing import List


class SelectedAnswer(BaseModel):
    question_id: int
    selected_option_ids: List[int]


class SubmitTestRequest(BaseModel):
    attempt_id: int
    answers: List[SelectedAnswer]
