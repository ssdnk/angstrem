from sqlalchemy import Column, Integer, Text
from app.database import Base


class Admin(Base):
    __tablename__ = "admins"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(Text, nullable=False, unique=True)
    password_hash = Column(Text, nullable=False)
    full_name = Column(Text, nullable=False)
    created_at = Column(Text, nullable=False, default="datetime('now')")
