from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from jose import jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app.deps import get_current_user
from app.models.models import AdminProfile, User
from app.schemas.schemas import TokenResponse, UserLogin, UserOut, UserRegister

router = APIRouter(prefix="/api/auth", tags=["auth"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def create_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    return jwt.encode({"sub": user_id, "exp": expire}, settings.secret_key, algorithm=settings.algorithm)


@router.post("/register", response_model=TokenResponse, status_code=201)
def register(body: UserRegister, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if body.role not in ("admin", "candidate"):
        raise HTTPException(status_code=400, detail="Role must be admin or candidate")
    if body.role == "admin" and not body.company_name:
        raise HTTPException(status_code=400, detail="company_name required for admin")

    user = User(
        email=body.email,
        password_hash=pwd_context.hash(body.password),
        role=body.role,
        full_name=body.full_name,
    )
    db.add(user)
    db.flush()

    if body.role == "admin":
        db.add(AdminProfile(user_id=user.id, company_name=body.company_name))

    db.commit()
    db.refresh(user)
    return TokenResponse(access_token=create_token(str(user.id)))


@router.post("/login", response_model=TokenResponse)
def login(body: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not pwd_context.verify(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return TokenResponse(access_token=create_token(str(user.id)))


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    out = UserOut.model_validate(current_user)
    if current_user.role == "admin" and current_user.admin_profile:
        out.company_name = current_user.admin_profile.company_name
    return out
