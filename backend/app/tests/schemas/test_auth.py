"""Tests for app/schemas/auth.py's field constraints."""

import pytest
from pydantic import ValidationError

from app.schemas.auth import LoginRequest, SignupRequest


def test_signup_request_rejects_invalid_email():
    with pytest.raises(ValidationError):
        SignupRequest(email="not-an-email", password="secret", full_name="Student One")


def test_signup_request_defaults_role_to_student():
    request = SignupRequest(email="student@example.com", password="secret", full_name="Student One")

    assert request.role == "student"


def test_login_request_requires_password():
    with pytest.raises(ValidationError):
        LoginRequest(email="student@example.com")
