from datetime import date, timedelta
from typing import List


def calc_deadline(start: date, working_days: int) -> str:
    current = start
    counted = 0
    while counted < working_days:
        current += timedelta(days=1)
        if current.weekday() < 5:  # пн-пт
            counted += 1
    return current.isoformat()


def calc_score(questions, attempt_answers) -> tuple[int, bool, int]:
    """Returns (score_percent, is_passed, correct_count). passing_score passed separately."""
    from collections import defaultdict

    selected_by_question = defaultdict(set)
    for aa in attempt_answers:
        selected_by_question[aa.question_id].add(aa.answer_option_id)

    correct_count = 0
    total = len(questions)

    for q in questions:
        correct_ids = {opt.id for opt in q.answer_options if opt.is_correct}
        selected_ids = selected_by_question.get(q.id, set())
        if selected_ids == correct_ids:
            correct_count += 1

    score = round(correct_count / total * 100) if total > 0 else 0
    return score, correct_count, total
