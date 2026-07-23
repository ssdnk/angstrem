from sqlalchemy import Column, Integer, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class TestAttempt(Base):
    __tablename__ = "test_attempts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    enrollment_id = Column(Integer, ForeignKey("enrollments.id", ondelete="CASCADE"), nullable=False, unique=True)
    started_at = Column(Text, nullable=False)
    finished_at = Column(Text)
    score = Column(Integer)
    is_passed = Column(Integer)
    time_spent_seconds = Column(Integer)

    enrollment = relationship("Enrollment", back_populates="attempt")
    answers = relationship("AttemptAnswer", back_populates="attempt", cascade="all, delete-orphan")
