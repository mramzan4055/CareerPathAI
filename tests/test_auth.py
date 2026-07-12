import asyncio

import pytest
from fastapi import HTTPException

from auth import get_current_user_id


def test_missing_authorization_header_raises_401():
    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(get_current_user_id(authorization=None))
    assert exc_info.value.status_code == 401


def test_non_bearer_scheme_raises_401():
    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(get_current_user_id(authorization="Basic somevalue"))
    assert exc_info.value.status_code == 401


def test_bearer_with_empty_token_raises_401():
    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(get_current_user_id(authorization="Bearer "))
    assert exc_info.value.status_code == 401
