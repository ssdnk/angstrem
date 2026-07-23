from sqlalchemy import Column, Integer, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Test(Base):
    __tablename__ = "tests"

    id = Column(Integer, primary_key=True, autoincrement=True)
    training_id = Column(Integer, ForeignKey("trainings.id", ondelete="CASCADE"), nullable=False, unique=True)
    title = Column(Text, nullable=False)
    time_limit_minutes = Column(Integer, nullable=False, default=30)
    deadline_days = Column(Integer, nullable=False, default=5)
    passing_score = Column(Integer, nullable=False, default=70)
    is_active = Column(Integer, nullable=False, default=1)
    created_at = Column(Text, nullable=False, default="datetime('now')")
    created_by = Column(Integer, ForeignKey("admins.id"))

    training = relationship("Training", back_populates="test")
    questions = relationship("Question", back_populates="test", cascade="all, delete-orphan", order_by="Question.order_index")
