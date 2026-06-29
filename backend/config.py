from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    APP_NAME: str = "Nexus Sport"
    DEBUG: bool = True
    DATABASE_URL: str = "db/nexus.db"
    SECRET_KEY: str = "cambiar-en-produccion"

    SPORTS_API_KEY: str = ""
    SPORTS_API_URL: str = "https://v3.football.api-sports.io"

    PRICE_GROUP_STAGE: float = 3.00
    PRICE_KNOCKOUT: float = 5.00


settings = Settings()
