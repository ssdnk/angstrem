import os

SECRET_KEY = os.getenv("SECRET_KEY", "angstrem-super-secret-key-32-chars-long!!")
ALGORITHM = "HS256"
ADMIN_TOKEN_EXPIRE_HOURS = 8
EMPLOYEE_TOKEN_EXPIRE_HOURS = 2
