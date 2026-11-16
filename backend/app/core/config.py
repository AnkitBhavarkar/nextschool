import os
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "NextSchool WhatsApp Communication Platform"
    API_V1_STR: str = "/api/v1"
    
    # Database
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres_dev_password"
    POSTGRES_DB: str = "nextschool"
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_URL: str = "sqlite+aiosqlite:///./nextschool_dev.db"
    
    # Auth & Tokens
    SECRET_KEY: str = "super-secret-key-change-me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    
    # Cookie Configuration
    COOKIE_NAME: str = "ns_access_token"
    CSRF_COOKIE_NAME: str = "ns_csrf_token"
    COOKIE_SECURE: bool = False
    COOKIE_SAMESITE: str = "lax"
    
    # CORS
    BACKEND_CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"
    
    # Bootstrap
    BOOTSTRAP_ADMIN_EMAIL: str = "admin@nextschool.internal"
    BOOTSTRAP_ADMIN_PASSWORD: str = "AdminSecurePass2026!"
    BOOTSTRAP_ADMIN_NAME: str = "Principal Sharma"
    
    BOOTSTRAP_TEACHER_EMAIL: str = "teacher1@nextschool.internal"
    BOOTSTRAP_TEACHER_PASSWORD: str = "TeacherSecurePass2026!"
    BOOTSTRAP_TEACHER_NAME: str = "Mrs. Ananya Verma"

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.BACKEND_CORS_ORIGINS.split(",") if origin.strip()]

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()

