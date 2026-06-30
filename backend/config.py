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

    # API-Football (api-sports.io) — 100 req/day free tier
    SPORTS_API_KEY: str = "2ef79c28645eb3c1041bd8768da83e65"
    SPORTS_API_URL: str = "https://v3.football.api-sports.io"

    # football-data.org — primary match source
    FOOTBALL_DATA_KEY: str = "cce6c60e411047abb142e005de2d957a"
    FOOTBALL_DATA_URL: str = "https://api.football-data.org/v4"

    # The Odds API — bookmaker odds
    ODDS_API_KEY: str = "622b4b772a4d155e032de1c17a83e41a"
    ODDS_API_URL: str = "https://api.the-odds-api.com/v4"

    PRICE_GROUP_STAGE: float = 3.00
    PRICE_KNOCKOUT: float = 5.00


settings = Settings()
