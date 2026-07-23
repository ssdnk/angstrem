from sqlalchemy import Column, Integer, Text, Float, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Training(Base):
    __tablename__ = "trainings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(Text, nullable=False)
    provider = Column(Text, nullable=False)
    training_type = Column(Text, nullable=False)  # 'external' | 'internal'
    start_date = Column(Text, nullable=False)
    end_date = Column(Text, nullable=False)
    duration_hours = Column(Float, nullable=False)
    description = Column(Text)
    created_at = Column(Text, nullable=False, default="datetime('now')")
    created_by = Column(Integer, ForeignKey("admins.id"))

    enrollments = relationship("Enrollment", back_populates="training", cascade="all, delete-orphan")
    test = relationship("Test", back_populates="training", uselist=False, cascade="all, delete-orphan")
