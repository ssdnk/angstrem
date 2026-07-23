from sqlalchemy import Column, Integer, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base


class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, autoincrement=True)
    last_name = Column(Text, nullable=False)
    first_name = Column(Text, nullable=False)
    department = Column(Text, nullable=False)
    created_at = Column(Text, nullable=False, default="datetime('now')")

    enrollments = relationship("Enrollment", back_populates="employee", cascade="all, delete-orphan")

    __table_args__ = (UniqueConstraint("last_name", "first_name", "department"),)
