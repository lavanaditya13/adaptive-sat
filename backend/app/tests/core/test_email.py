from resend.exceptions import InvalidApiKeyError

from app.core import email as email_module


def test_send_email_uses_resend_client(monkeypatch):
    captured = {}

    def fake_send(params, options=None):
        captured["params"] = params
        captured["options"] = options
        return {"id": "email_123"}

    monkeypatch.setattr(email_module.settings, "RESEND_API_KEY", "re_test_key")
    monkeypatch.setattr(email_module.resend.Emails, "send", fake_send)

    response = email_module.send_email(
        to="student@example.com",
        subject="Hello",
        html="<p>Hi</p>",
    )

    assert response == {"id": "email_123"}
    assert email_module.resend.api_key == "re_test_key"
    assert captured["params"] == {
        "from": email_module.DEFAULT_FROM_EMAIL,
        "to": "student@example.com",
        "subject": "Hello",
        "html": "<p>Hi</p>",
    }
    assert captured["options"] is None


def test_send_email_requires_api_key(monkeypatch):
    monkeypatch.setattr(email_module.settings, "RESEND_API_KEY", "")

    try:
        email_module.send_email(
            to="student@example.com",
            subject="Hello",
            html="<p>Hi</p>",
        )
    except email_module.EmailConfigurationError as exc:
        assert "RESEND_API_KEY" in str(exc)
    else:
        raise AssertionError("EmailConfigurationError was not raised")


def test_send_email_wraps_resend_errors(monkeypatch):
    monkeypatch.setattr(email_module.settings, "RESEND_API_KEY", "re_test_key")

    def fake_send(params, options=None):
        raise InvalidApiKeyError("", "invalid_api_key", 403)

    monkeypatch.setattr(email_module.resend.Emails, "send", fake_send)

    try:
        email_module.send_email(
            to="student@example.com",
            subject="Hello",
            html="<p>Hi</p>",
        )
    except email_module.EmailSendError as exc:
        assert "Failed to send email via Resend" in str(exc)
    else:
        raise AssertionError("EmailSendError was not raised")