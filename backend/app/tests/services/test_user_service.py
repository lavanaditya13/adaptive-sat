"""Tests for app/services/user_service.py."""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from app.services import user_service


@pytest.mark.parametrize(
    ("first_name", "last_name", "expected"),
    [
        ("Alex", "Chen", "Alex Chen"),
        ("  Alex  ", "  Chen  ", "Alex Chen"),
        ("Cher", "", "Cher"),
        ("Cher", "   ", "Cher"),
        ("Ana Maria", "de la Cruz", "Ana Maria de la Cruz"),
    ],
)
def test_compose_full_name(first_name, last_name, expected):
    assert user_service.compose_full_name(first_name, last_name) == expected


@pytest.mark.asyncio
async def test_update_user_profile_writes_only_full_name(monkeypatch):
    user = SimpleNamespace(id=1, full_name="Alex Chen")
    updated = SimpleNamespace(id=1, full_name="Alex Rivera")
    update_mock = AsyncMock(return_value=updated)
    monkeypatch.setattr(user_service.user_repository, "update", update_mock)

    result = await user_service.update_user_profile(
        db=SimpleNamespace(),
        user=user,
        first_name="Alex",
        last_name="Rivera",
    )

    assert result is updated
    assert update_mock.call_args.kwargs["obj_in"] == {"full_name": "Alex Rivera"}
