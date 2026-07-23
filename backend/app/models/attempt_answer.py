from sqlalchemy import Column, Integer, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base


class AttemptAnswer(Base):
    __tablename__ = "attempt_answers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    attempt_id = Column(Integer, ForeignKey("test_attempts.id", ondelete="CASCADE"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    answer_option_id = Column(Integer, ForeignKey("answer_options.id"), nullable=False)

    attempt = relationship("TestAttempt", back_populates="answers")

    __table_args__ = (UniqueConstraint("attempt_id", "question_id", "answer_option_id"),)
