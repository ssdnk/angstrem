from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.admin import Admin
from app.models.employee import Employee
from app.core.security import verify_password, create_token
from app.core.config import ADMIN_TOKEN_EXPIRE_HOURS, EMPLOYEE_TOKEN_EXPIRE_HOURS
from app.schemas.auth import AdminLoginRequest, EmployeeIdentifyRequest

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/admin/login")
def admin_login(body: AdminLoginRequest, db: Session = Depends(get_db)):
    admin = db.query(Admin).filter(Admin.username == body.username).first()
    if not admin or not verify_password(body.password, admin.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Неверный логин или пароль")

    token = create_token({"sub": str(admin.id), "type": "admin"}, ADMIN_TOKEN_EXPIRE_HOURS)
    return {
        "token": token,
        "admin": {"id": admin.id, "username": admin.username, "full_name": admin.full_name},
    }


@router.post("/admin/logout")
def admin_logout():
    return {"message": "ok"}


@router.post("/employee/identify")
def employee_identify(body: EmployeeIdentifyRequest, db: Session = Depends(get_db)):
    employee = (
        db.query(Employee)
        .filter(
            Employee.last_name == body.last_name,
            Employee.first_name == body.first_name,
            Employee.department == body.department,
        )
        .first()
    )
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Сотрудник не найден в системе")

    token = create_token({"sub": str(employee.id), "type": "employee"}, EMPLOYEE_TOKEN_EXPIRE_HOURS)
    return {
        "token": token,
        "employee": {
            "id": employee.id,
            "last_name": employee.last_name,
            "first_name": employee.first_name,
            "department": employee.department,
        },
    }
