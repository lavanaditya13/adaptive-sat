import json
from urllib.parse import (
    parse_qsl,
    quote_plus,
    urlencode,
    urlsplit,
    urlunsplit,
)

from pydantic import AliasChoices, Field, ValidationInfo, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
        validate_default=True,
    )

    # Application
    PROJECT_NAME: str = "Adaptive SAT Learning Platform"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"

    # CORS
    CORS_ORIGINS: str = (
        "http://localhost:5173,"
        "http://127.0.0.1:5173,"
        "http://localhost:3000,"
        "http://127.0.0.1:3000"
    )

    # Practice settings
    DEFAULT_PRACTICE_QUESTION_COUNT: int = 25

    # Security
    SECRET_KEY: str = "change-this-secret-key"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24
    RESEND_API_KEY: str = ""
    FRONTEND_URL: str = "http://localhost:5173"
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/google/callback"
    APPLE_CLIENT_ID: str = ""
    APPLE_TEAM_ID: str = ""
    APPLE_KEY_ID: str = ""
    APPLE_PRIVATE_KEY: str = ""
    APPLE_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/apple/callback"

    # PostgreSQL credentials used when DATABASE_URL is not provided
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "adaptive_sat"
    POSTGRES_PORT: int = 5432

    # Pooled async connection used by FastAPI.
    # Vercel's Neon integration prefixes injected vars (e.g. "added_DATABASE_URL")
    # when the plain name is already taken by another connected resource —
    # accept either so the dashboard doesn't need to be renamed by hand.
    DATABASE_URL: str = Field(
        default="",
        validation_alias=AliasChoices(
            "DATABASE_URL", "added_DATABASE_URL", "ADDED_DATABASE_URL"
        ),
    )

    # Direct connection supplied by Neon
    DATABASE_URL_UNPOOLED: str = Field(
        default="",
        validation_alias=AliasChoices(
            "DATABASE_URL_UNPOOLED",
            "added_DATABASE_URL_UNPOOLED",
            "ADDED_DATABASE_URL_UNPOOLED",
        ),
    )

    # Synchronous connection used by Alembic
    SYNC_DATABASE_URL: str = ""

    @property
    def cors_origins(self) -> list[str]:
        """
        Parse CORS origins supplied as either a comma-separated string
        or a JSON array.

        Examples:

        CORS_ORIGINS=http://localhost:5173,https://example.vercel.app

        CORS_ORIGINS=["http://localhost:5173","https://example.vercel.app"]
        """
        raw_value = (self.CORS_ORIGINS or "").strip()

        if not raw_value:
            return []

        if raw_value.startswith("["):
            try:
                parsed = json.loads(raw_value)

                if isinstance(parsed, list):
                    return [
                        str(origin).strip()
                        for origin in parsed
                        if str(origin).strip()
                    ]
            except json.JSONDecodeError:
                pass

        return [
            origin.strip()
            for origin in raw_value.split(",")
            if origin.strip()
        ]

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def assemble_async_db_connection(
        cls,
        value: str,
        info: ValidationInfo,
    ) -> str:
        """
        Build the asynchronous SQLAlchemy URL used by FastAPI.

        Converts standard PostgreSQL URLs into the asyncpg format and
        normalizes Neon SSL query parameters.
        """
        if value and value.strip():
            url = value.strip()

            if url.startswith("postgres://"):
                url = url.replace(
                    "postgres://",
                    "postgresql://",
                    1,
                )

            if url.startswith("postgresql://"):
                url = url.replace(
                    "postgresql://",
                    "postgresql+asyncpg://",
                    1,
                )

            parsed = urlsplit(url)

            query = dict(
                parse_qsl(
                    parsed.query,
                    keep_blank_values=True,
                )
            )

            ssl_mode = query.pop("sslmode", None)

            # channel_binding is a libpq parameter and is not supported
            # by asyncpg.
            query.pop("channel_binding", None)

            if ssl_mode and "ssl" not in query:
                query["ssl"] = ssl_mode

            return urlunsplit(
                (
                    parsed.scheme,
                    parsed.netloc,
                    parsed.path,
                    urlencode(query),
                    parsed.fragment,
                )
            )

        data = info.data

        user = quote_plus(
            str(data.get("POSTGRES_USER", "postgres"))
        )
        password = quote_plus(
            str(data.get("POSTGRES_PASSWORD", "postgres"))
        )
        server = str(
            data.get("POSTGRES_SERVER", "localhost")
        )
        port = int(
            data.get("POSTGRES_PORT", 5432)
        )
        database = quote_plus(
            str(data.get("POSTGRES_DB", "adaptive_sat"))
        )

        return (
            f"postgresql+asyncpg://"
            f"{user}:{password}@{server}:{port}/{database}"
        )

    @field_validator("SYNC_DATABASE_URL", mode="before")
    @classmethod
    def assemble_sync_db_connection(
        cls,
        value: str,
        info: ValidationInfo,
    ) -> str:
        """
        Build the synchronous PostgreSQL URL used by Alembic.

        Prefers the direct Neon connection when available, then falls
        back to DATABASE_URL or the individual PostgreSQL settings.
        """
        if value and value.strip():
            url = value.strip()
        else:
            url = str(
                info.data.get("DATABASE_URL_UNPOOLED")
                or info.data.get("DATABASE_URL")
                or ""
            ).strip()

        if url:
            if url.startswith("postgres://"):
                url = url.replace(
                    "postgres://",
                    "postgresql://",
                    1,
                )

            if url.startswith("postgresql+asyncpg://"):
                url = url.replace(
                    "postgresql+asyncpg://",
                    "postgresql://",
                    1,
                )

            parsed = urlsplit(url)

            query = dict(
                parse_qsl(
                    parsed.query,
                    keep_blank_values=True,
                )
            )

            # Remove the Neon channel-binding parameter for compatibility
            # with synchronous PostgreSQL drivers.
            query.pop("channel_binding", None)

            return urlunsplit(
                (
                    parsed.scheme,
                    parsed.netloc,
                    parsed.path,
                    urlencode(query),
                    parsed.fragment,
                )
            )

        data = info.data

        user = quote_plus(
            str(data.get("POSTGRES_USER", "postgres"))
        )
        password = quote_plus(
            str(data.get("POSTGRES_PASSWORD", "postgres"))
        )
        server = str(
            data.get("POSTGRES_SERVER", "localhost")
        )
        port = int(
            data.get("POSTGRES_PORT", 5432)
        )
        database = quote_plus(
            str(data.get("POSTGRES_DB", "adaptive_sat"))
        )

        return (
            f"postgresql://"
            f"{user}:{password}@{server}:{port}/{database}"
        )


settings = Settings()
