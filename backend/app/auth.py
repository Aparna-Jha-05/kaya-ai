"""Supabase Auth & Row Level Security (RLS) Service Layer for PO-LICE."""

from __future__ import annotations

import logging
import os
from typing import Any, Dict, Optional

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

logger = logging.getLogger(__name__)

security = HTTPBearer(auto_error=False)


class SupabaseAuthService:
    """Supabase Auth & RLS Service verifying JWT tokens and project tenant boundaries."""

    @staticmethod
    def is_auth_enabled() -> bool:
        """Check if SUPABASE_JWT_SECRET is configured."""
        secret = os.getenv("SUPABASE_JWT_SECRET", "").strip()
        return bool(secret)

    @classmethod
    def verify_token(cls, token: str) -> Dict[str, Any]:
        """Verify Supabase Auth JWT token."""
        secret = os.getenv("SUPABASE_JWT_SECRET", "").strip()
        if not secret:
            # Demo Mode fallback payload
            return {
                "sub": "demo-officer-id",
                "email": "officer-1@police.gov",
                "role": "authenticated",
                "user_metadata": {"full_name": "Demo Officer"},
            }

        try:
            import jwt  # type: ignore

            payload = jwt.decode(token, secret, algorithms=["HS256"], audience="authenticated")
            return payload
        except Exception as err:
            logger.warning("JWT Token verification failed: %s", err)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired authentication token.",
            ) from err


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Dict[str, Any]:
    """FastAPI dependency resolving current user identity with demo-mode fallback."""
    # Check Bearer Token
    if credentials and credentials.credentials:
        return SupabaseAuthService.verify_token(credentials.credentials)

    # Demo Mode Fallback
    demo_mode = os.getenv("DEMO_MODE", "true").lower() in ("true", "1", "yes")
    if demo_mode:
        actor = request.headers.get("X-Demo-Actor", os.getenv("DEMO_ACTOR", "officer-1@police.gov"))
        return {
            "sub": "demo-officer-id",
            "email": actor,
            "role": "authenticated",
            "user_metadata": {"full_name": "Demo Procurement Officer"},
        }

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication credentials were not provided.",
    )
