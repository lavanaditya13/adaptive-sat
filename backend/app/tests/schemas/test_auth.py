"""Tests for app/schemas/auth.py's field constraints."""

import pytest
from pydantic import ValidationError

from app.schemas.auth import LoginRequest, SignupRequest


def test_signup_request_rejects_invalid_email():
    with pytest.raises(ValidationError):
        SignupRequest(
            email="not-an-email", password="secret", first_name="Student", last_name="One"
        )


def test_signup_request_defaults_role_to_student():
    request = SignupRequest(
        email="student@example.com",
        password="secretpass",
        first_name="Student",
        last_name="One",
    )

    assert request.role == "student"


def test_signup_request_composes_full_name_is_not_persisted_on_the_schema():
    """SignupRequest carries first/last name; full_name is composed downstream
    in the endpoint (see user_service.compose_full_name), not on the schema."""
    request = SignupRequest(
        email="student@example.com",
        password="secretpass",
        first_name="Student",
        last_name="One",
    )

    assert not hasattr(request, "full_name")


def test_signup_request_allows_empty_last_name_for_a_mononym():
    request = SignupRequest(
        email="cher@example.com",
        password="secretpass",
        first_name="Cher",
        last_name="",
    )

    assert request.last_name == ""


def test_signup_request_rejects_blank_first_name():
    with pytest.raises(ValidationError):
        SignupRequest(
            email="student@example.com",
            password="secretpass",
            first_name="   ",
            last_name="One",
        )


def test_login_request_requires_password():
    with pytest.raises(ValidationError):
        LoginRequest(email="student@example.com")
