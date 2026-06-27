from typing import Any
from typing import Any

import logging
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from backend.app.core.config import settings
from backend.app.core.supabase import supabase

logger = logging.getLogger(__name__)
bearer_scheme = HTTPBearer()


def decode_supabase_token(token: str) -> Any:
    """
    Validate a Supabase access token using the Supabase Auth API
    and return a payload compatible with the rest of the backend.
    """
    try:
        response = supabase.auth.get_user(token)

        if response is None or response.user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate Supabase token",
                headers={"WWW-Authenticate": "Bearer"},
            )

        user = response.user

        # Return a payload similar to jwt.decode()
        return {
            "sub": user.id,
            "email": user.email,
            "role": getattr(user, "role", None),
            "user_metadata": getattr(user, "user_metadata", {}),
            "app_metadata": getattr(user, "app_metadata", {}),
        }

    except Exception as exc:
        logger.exception("Supabase token validation failed")

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate Supabase token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


def verify_supabase_token(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> Any:
    # print(credentials) for debugging
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return decode_supabase_token(credentials.credentials)
