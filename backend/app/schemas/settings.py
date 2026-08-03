from datetime import datetime

from pydantic import BaseModel


class ConnectedProviderItem(BaseModel):
    provider: str
    linked_at: datetime
    email: str | None = None


class ConnectedProvidersResponse(BaseModel):
    providers: list[ConnectedProviderItem]
    has_password: bool
