from datetime import datetime, timedelta
from jose import JWTError, jwt
import bcrypt
from app.core.config import SECRET_KEY, ALGORITHM


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12)).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def create_token(data: dict, expire_hours: int) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(hours=expire_hours)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
