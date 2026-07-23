from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from jose import JWTError
from app.database import get_db
from app.core.security import decode_token
from app.models.admin import Admin
from app.models.employee import Employee

bearer = HTTPBearer()


def get_current_admin(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
) -> Admin:
    token = credentials.credentials
    try:
        payload = decode_token(token)
        if payload.get("type") != "admin":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Недостаточно прав")
        admin_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Невалидный токен")

    admin = db.query(Admin).filter(Admin.id == int(admin_id)).first()
    if not admin:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Администратор не найден")
    return admin


def get_current_employee(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
) -> Employee:
    token = credentials.credentials
    try:
        payload = decode_token(token)
        if payload.get("type") != "employee":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Недостаточно прав")
        employee_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Невалидный токен")

    employee = db.query(Employee).filter(Employee.id == int(employee_id)).first()
    if not employee:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Сотрудник не найден")
    return employee
