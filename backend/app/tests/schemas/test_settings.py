"""Tests for app/schemas/settings.py."""

from datetime import datetime, timezone

from app.schemas.settings import ConnectedProviderItem, ConnectedProvidersResponse


def test_connected_provider_item_email_defaults_to_none():
    item = ConnectedProviderItem(provider="google", linked_at=datetime.now(timezone.utc))

    assert item.email is None


def test_connected_providers_response_holds_a_list_of_providers():
    response = ConnectedProvidersResponse(
        providers=[
            ConnectedProviderItem(
                provider="google", linked_at=datetime.now(timezone.utc), email="student@example.com"
            )
        ],
        has_password=False,
    )

    assert len(response.providers) == 1
    assert response.has_password is False
