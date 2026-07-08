from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import jwt, JWTError
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.app.auth import schemas
from backend.app.auth.supabase_guard import decode_supabase_token, verify_supabase_token
from backend.app.core.config import settings
from backend.app.core.database import get_db
from backend.app.core.security import verify_password, create_access_token, ALGORITHM, get_password_hash
from backend.app.models.user import User, UserRole
from backend.app.models.student import Student

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")


def get_or_create_user_from_supabase_payload(db: Session, payload: Any) -> User:
    supabase_id = payload.get("sub")
    email = payload.get("email")
    user_metadata = payload.get("user_metadata") or {}
    full_name = user_metadata.get("full_name") or payload.get("name") or email.split("@")[0]

    if not supabase_id or not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Supabase payload",
        )

    normalized_email = email.strip().lower()
    user = db.query(User).filter(User.supabase_user_id == supabase_id).first()
    if not user:
        user = db.query(User).filter(func.lower(User.email) == normalized_email).first()
        if user:
            user.supabase_user_id = supabase_id
        else:
            user = User(
                email=normalized_email,
                full_name=full_name,
                supabase_user_id=supabase_id,
                is_active=True,
            )
            db.add(user)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        user = db.query(User).filter(func.lower(User.email) == normalized_email).first()
        if user is None:
            raise
        if not user.supabase_user_id:
            user.supabase_user_id = supabase_id
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            # Existing user already linked; return existing user.
            db.refresh(user)
    else:
        db.refresh(user)

    # Automatically create Student profile if user is a student and has no profile
    if user.role == UserRole.STUDENT:
        student = db.query(Student).filter(Student.user_id == user.id).first()
        if not student:
            import random
            usn_val = f"USN-{user.id:04d}"
            # Ensure unique usn (in case it exists)
            while db.query(Student).filter(Student.usn == usn_val).first():
                usn_val = f"USN-{user.id:04d}-{random.randint(10, 99)}"
                
            student = Student(
                user_id=user.id,
                usn=usn_val,
                department="CSE",  # default
                semester=1,        # default
                attendance_rate=100.0,
                cgpa=0.0,
                success_score=100.0,
                risk_status="Green",
                consent_given=True,
                is_under_18=False,
            )
            db.add(student)
            db.commit()
            db.refresh(user)

    return user


def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    user = None
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        token_data = schemas.TokenPayload(sub=user_id)
        user = db.query(User).filter(User.id == int(token_data.sub)).first()
    except JWTError:
        try:
            payload = decode_supabase_token(token)
            user = get_or_create_user_from_supabase_payload(db, payload)
        except HTTPException:
            raise credentials_exception

    if not user:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Inactive user",
        )
    return user


def require_role(*roles: str):
    """
    Dependency factory enforcing role-based access. Role is read from the
    DB-backed User (never from the client), so the JWT format is unchanged.

    Usage: ``Depends(require_role("Admin", "HOD"))``
    Roles use the capitalised values defined in ``UserRole``.
    """

    def checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {', '.join(roles)}",
            )
        return current_user

    return checker


@router.post("/login", response_model=schemas.Token)
def login(db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()) -> Any:
    """Authenticate a local user with email and password."""
    normalized_email = form_data.username.strip().lower()
    user = db.query(User).filter(func.lower(User.email) == normalized_email).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="This email does not exist. Please sign up first.",
        )
    # Accounts created via Google/Supabase may be linked without a local password.
    # Distinguish that case so the frontend can offer password-reset or Google sign-in.
    if not user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No local password set. Sign in with Google or request a password reset.",
        )
    if not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user",
        )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": create_access_token(user.id, expires_delta=access_token_expires),
        "token_type": "bearer",
    }


@router.post("/register", response_model=schemas.Token)
def register(user_create: schemas.UserCreate, db: Session = Depends(get_db)) -> Any:
    """Register a new local user with a hashed password."""
    normalized_email = user_create.email.strip().lower()
    existing_user = db.query(User).filter(func.lower(User.email) == normalized_email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This email is already registered. Please sign in instead.",
        )

    user = User(
        email=normalized_email,
        full_name=user_create.full_name.strip(),
        hashed_password=get_password_hash(user_create.password),
        role=UserRole.STUDENT if user_create.role == "Student" else UserRole(user_create.role),
        is_active=True,
    )
    db.add(user)
    try:
        db.commit()
        db.refresh(user)
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Could not create user: {exc}") from exc

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": create_access_token(user.id, expires_delta=access_token_expires),
        "token_type": "bearer",
    }


@router.get("/me", response_model=schemas.UserResponse)
def read_user_me(current_user: User = Depends(get_current_user)) -> Any:
    """
    Get current logged in user profile.
    """
    return current_user


@router.post("/supabase/sync", response_model=schemas.UserResponse)
def sync_supabase_user(
    payload: Any = Depends(verify_supabase_token),
    db: Session = Depends(get_db),
) -> Any:
    """Sync or create a local user for the signed-in Supabase user."""
    return get_or_create_user_from_supabase_payload(db, payload)


@router.post("/supabase/login", response_model=schemas.Token)
def login_with_supabase_token(
    payload: Any = Depends(verify_supabase_token),
    db: Session = Depends(get_db),
) -> Any:
    """Create or update a local user from a Supabase token and return an internal JWT."""
    user = get_or_create_user_from_supabase_payload(db, payload)
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": create_access_token(user.id, expires_delta=access_token_expires),
        "token_type": "bearer",
    }


@router.post("/password-reset/request")
def request_password_reset(
    reset_request: schemas.PasswordResetRequest,
    db: Session = Depends(get_db)
) -> Any:
    """
    Initiate a password reset flow (sends mock reset link).
    """
    user = db.query(User).filter(User.email == reset_request.email).first()
    if not user:
        # Avoid user enumeration by returning a generic success message
        return {"message": "If this email exists in our system, a password reset link has been sent."}
    
    # In a real environment, generate token, save it, and send email.
    return {"message": "Password reset email sent (Mock). Use token 'mock-token' to verify."}


@router.post("/password-reset/confirm")
def confirm_password_reset(
    reset_confirm: schemas.PasswordResetConfirm,
    db: Session = Depends(get_db)
) -> Any:
    """
    Confirm password reset using the token sent via email.
    """
    if reset_confirm.token != "mock-token":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    # In a real environment, look up token, find user, update password.
    return {"message": "Password has been reset successfully."}
