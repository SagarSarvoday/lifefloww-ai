"""Application configuration settings for LifeFlow AI backend."""

import os
from typing import Optional
from urllib.parse import urlparse, urlunparse
from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables or .env file."""

    # Application settings
    APP_NAME: str = "LifeFlow AI Backend"
    APP_ENV: str = Field(default="development", description="Environment: development, production, test")
    APP_TIMEZONE: str = Field(
        default="Asia/Kolkata",
        description="Default IANA timezone used for relative datetime parsing"
    )

    # Ollama Cloud settings
    OLLAMA_API_KEY: Optional[SecretStr] = Field(
        default=None,
        description="API Key for Ollama Cloud (https://ollama.com)"
    )
    OLLAMA_MODEL: str = Field(
        default="gpt-oss:20b",
        description="Ollama Cloud model name (must be a valid cloud model)"
    )
    OLLAMA_HOST: str = Field(
        default="https://ollama.com",
        description="Ollama host endpoint"
    )
    OLLAMA_TIMEOUT: float = Field(
        default=30.0,
        description="Timeout in seconds for Ollama API requests"
    )

    # Testing flags
    RUN_OLLAMA_INTEGRATION_TESTS: bool = Field(
        default=False,
        description="Whether to run live integration tests against Ollama Cloud"
    )

    # Supabase PostgreSQL Configuration
    DATABASE_URL: Optional[SecretStr] = Field(
        default=None,
        description="PostgreSQL connection string for Supabase"
    )
    DB_POOL_SIZE: int = Field(default=5, description="Connection pool size")
    DB_MAX_OVERFLOW: int = Field(default=10, description="Max overflow connections")
    DB_POOL_TIMEOUT: float = Field(default=30.0, description="Timeout waiting for connection")

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def api_key_str(self) -> Optional[str]:
        """Safely retrieve the raw API key string without exposing it in logs/repr."""
        if self.OLLAMA_API_KEY is not None:
            return self.OLLAMA_API_KEY.get_secret_value()
        return None

    @property
    def database_url_str(self) -> Optional[str]:
        """Safely retrieve the raw database URL string."""
        if self.DATABASE_URL is not None:
            return self.DATABASE_URL.get_secret_value()
        return None

    @property
    def async_database_url(self) -> Optional[str]:
        """
        Normalize the database URL for async SQLAlchemy with psycopg 3.
        Converts 'postgresql://' or 'postgres://' to 'postgresql+psycopg://'.
        """
        raw_url = self.database_url_str
        if not raw_url:
            return None

        # Convert schemes to postgresql+psycopg
        if raw_url.startswith("postgres://"):
            return "postgresql+psycopg://" + raw_url[len("postgres://") :]
        elif raw_url.startswith("postgresql://") and not raw_url.startswith("postgresql+"):
            return "postgresql+psycopg://" + raw_url[len("postgresql://") :]

        return raw_url

    @property
    def masked_database_url(self) -> str:
        """Return a masked representation of the database URL for logging purposes."""
        raw_url = self.database_url_str
        if not raw_url:
            return "Not Configured"
        try:
            parsed = urlparse(raw_url)
            netloc = parsed.netloc
            if "@" in netloc:
                user_info, host_info = netloc.split("@", 1)
                username = user_info.split(":")[0] if ":" in user_info else user_info
                netloc = f"{username}:****@{host_info}"
            masked = urlunparse((parsed.scheme, netloc, parsed.path, parsed.params, parsed.query, parsed.fragment))
            return masked
        except Exception:
            return "****"


# Global settings instance
settings = Settings()
