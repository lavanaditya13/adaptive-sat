from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _make_user(user_id=1, email="test@example.com", full_name="Test User", role="student"):
    user = MagicMock()
    user.id = user_id
    user.email = email
    user.full_name = full_name
    user.role = role
    user.is_active = True
    user.hashed_password = "$2b$12$placeholder"
    return user


class TestSignup:
    def test_signup_success(self):
        """Signup creates a new user and returns user info (no token)."""
        new_user = _make_user()

        with (
            patch(
                "app.api.v1.endpoints.auth.user_repository.get_by_email",
                new_callable=AsyncMock,
                return_value=None,
            ),
            patch(
                "app.api.v1.endpoints.auth.user_repository.create_user",
                new_callable=AsyncMock,
                return_value=new_user,
            ),
        ):
            response = client.post(
                "/api/v1/auth/signup",
                json={
                    "email": "test@example.com",
                    "password": "SecurePass1!",
                    "full_name": "Test User",
                    "role": "student",
                },
            )

        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "test@example.com"
        assert data["role"] == "student"
        assert "access_token" not in data

    def test_signup_duplicate_email(self):
        """Signup with existing email returns 400."""
        existing_user = _make_user()

        with patch(
            "app.api.v1.endpoints.auth.user_repository.get_by_email",
            new_callable=AsyncMock,
            return_value=existing_user,
        ):
            response = client.post(
                "/api/v1/auth/signup",
                json={
                    "email": "test@example.com",
                    "password": "SecurePass1!",
                    "full_name": "Test User",
                    "role": "student",
                },
            )

        assert response.status_code == 400
        assert "already registered" in response.json()["detail"]


class TestLogin:
    def test_login_success_no_access_token_in_body(self):
        """Login returns user info only — no access_token in response body."""
        user = _make_user()

        with (
            patch(
                "app.api.v1.endpoints.auth.user_repository.get_by_email",
                new_callable=AsyncMock,
                return_value=user,
            ),
            patch(
                "app.api.v1.endpoints.auth.verify_password",
                return_value=True,
            ),
        ):
            response = client.post(
                "/api/v1/auth/login",
                json={"email": "test@example.com", "password": "SecurePass1!", "role": "student"},
            )

        assert response.status_code == 200
        data = response.json()
        # access_token must NOT appear in the response body
        assert "access_token" not in data
        assert "token_type" not in data
        assert "expires_in" not in data
        # User info must be present
        assert "user" in data
        assert data["user"]["email"] == "test@example.com"
        assert data["user"]["role"] == "student"

    def test_login_sets_session_cookie(self):
        """Login sets an HTTP-only session cookie instead of returning a token."""
        user = _make_user()

        with (
            patch(
                "app.api.v1.endpoints.auth.user_repository.get_by_email",
                new_callable=AsyncMock,
                return_value=user,
            ),
            patch(
                "app.api.v1.endpoints.auth.verify_password",
                return_value=True,
            ),
        ):
            response = client.post(
                "/api/v1/auth/login",
                json={"email": "test@example.com", "password": "SecurePass1!", "role": "student"},
            )

        assert response.status_code == 200
        # Session cookie must be set
        assert "session" in response.cookies

    def test_login_wrong_password(self):
        """Login with wrong password returns 401."""
        user = _make_user()

        with (
            patch(
                "app.api.v1.endpoints.auth.user_repository.get_by_email",
                new_callable=AsyncMock,
                return_value=user,
            ),
            patch(
                "app.api.v1.endpoints.auth.verify_password",
                return_value=False,
            ),
        ):
            response = client.post(
                "/api/v1/auth/login",
                json={"email": "test@example.com", "password": "wrongpass", "role": "student"},
            )

        assert response.status_code == 401

    def test_login_wrong_role(self):
        """Login with mismatched role returns 401."""
        user = _make_user(role="student")

        with (
            patch(
                "app.api.v1.endpoints.auth.user_repository.get_by_email",
                new_callable=AsyncMock,
                return_value=user,
            ),
            patch(
                "app.api.v1.endpoints.auth.verify_password",
                return_value=True,
            ),
        ):
            response = client.post(
                "/api/v1/auth/login",
                json={"email": "test@example.com", "password": "SecurePass1!", "role": "tutor"},
            )

        assert response.status_code == 401

    def test_login_user_not_found(self):
        """Login with unknown email returns 401."""
        with patch(
            "app.api.v1.endpoints.auth.user_repository.get_by_email",
            new_callable=AsyncMock,
            return_value=None,
        ):
            response = client.post(
                "/api/v1/auth/login",
                json={"email": "nobody@example.com", "password": "pass", "role": "student"},
            )

        assert response.status_code == 401


class TestRefreshEndpointRemoved:
    def test_refresh_endpoint_does_not_exist(self):
        """The /auth/refresh endpoint must be removed."""
        response = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": "sometoken"},
        )
        assert response.status_code == 404


class TestBearerTokenRemoved:
    def test_bearer_token_not_accepted(self):
        """Protected endpoints must not accept ****** — only session cookie."""
        # Use a fresh client with no cookies to ensure no session is carried over
        with TestClient(app) as fresh_client:
            response = fresh_client.get(
                "/api/v1/dashboard",
                headers={"Authorization": "******"},
            )
        # Without a valid session cookie, must return 401
        assert response.status_code == 401
