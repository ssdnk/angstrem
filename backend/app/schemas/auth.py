from pydantic import BaseModel


class AdminLoginRequest(BaseModel):
    username: str
    password: str


class AdminLoginResponse(BaseModel):
    token: str
    admin: dict


class EmployeeIdentifyRequest(BaseModel):
    last_name: str
    first_name: str
    department: str


class EmployeeIdentifyResponse(BaseModel):
    token: str
    employee: dict
