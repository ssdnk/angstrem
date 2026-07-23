from sqlalchemy import Column, Integer, Text, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base


class Enrollment(Base):
    __tablename__ = "enrollments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    training_id = Column(Integer, ForeignKey("trainings.id", ondelete="CASCADE"), nullable=False)
    enrolled_at = Column(Text, nullable=False, default="datetime('now')")
    deadline_date = Column(Text)

    employee = relationship("Employee", back_populates="enrollments")
    training = relationship("Training", back_populates="enrollments")
    attempt = relationship("TestAttempt", back_populates="enrollment", uselist=False, cascade="all, delete-orphan")

    __table_args__ = (UniqueConstraint("employee_id", "training_id"),)
