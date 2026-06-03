from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    app_name: str = "OmniParse"
    app_version: str = "0.1.0"
    debug: bool = False

    cors_origins: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    request_timeout_seconds: float = 30.0
    playwright_timeout_ms: int = 30000
    max_html_size_bytes: int = 5_000_000


settings = Settings()
