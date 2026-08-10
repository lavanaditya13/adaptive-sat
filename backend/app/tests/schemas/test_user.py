"""Tests for app/schemas/user.py's field constraints."""

import pytest
from pydantic import ValidationError

from app.schemas.user import UserCreate


def test_user_create_rejects_invalid_email():
    with pytest.raises(ValidationError):
        UserCreate(email="not-an-email", password="secret")


def test_user_create_defaults_role_to_student_and_active_true():
    user = UserCreate(email="student@example.com", password="secret")

    assert user.role == "student"
    assert user.is_active is True
