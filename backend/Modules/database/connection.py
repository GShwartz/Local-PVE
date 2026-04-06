import os
import sys
import asyncio
from typing import AsyncGenerator
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase


# ── Engine ────────────────────────────────────────────────────────────────────
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL environment variable is not set")

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,  # validates connections before checkout; handles stale TCP to remote host
)

# ── Session factory ───────────────────────────────────────────────────────────
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,  # keeps ORM objects usable after commit in async context
    autocommit=False,
    autoflush=False,
)


# ── Base class for ORM models ─────────────────────────────────────────────────
class Base(DeclarativeBase):
    pass


# ── FastAPI dependency ────────────────────────────────────────────────────────
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


# ── DB connection validator ───────────────────────────────────────────────────
async def validate_db_connection(retries: int = 3, delay: float = 2.0) -> None:
    """
    Verify the database is reachable before the app starts.
    Retries a few times to tolerate brief startup delays, then exits with a
    clear error message if the connection cannot be established.
    """
    # Mask the password in the URL for safe printing
    display_url = DATABASE_URL
    try:
        from urllib.parse import urlparse, urlunparse
        parsed = urlparse(DATABASE_URL)
        if parsed.password:
            masked = parsed._replace(netloc=parsed.netloc.replace(parsed.password, "***"))
            display_url = urlunparse(masked)
    except Exception:
        pass

    print(f"  → Connecting to database: {display_url}")

    last_error: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
            print("  ✓ Database connection OK")
            return
        except Exception as exc:
            last_error = exc
            if attempt < retries:
                print(f"  ✗ Attempt {attempt}/{retries} failed — retrying in {delay}s… ({exc})")
                await asyncio.sleep(delay)

    # All attempts failed — print a helpful message and abort
    print("\n" + "─" * 60)
    print("  DATABASE CONNECTION FAILED")
    print("─" * 60)
    print(f"  URL   : {display_url}")
    print(f"  Error : {last_error}")
    print()
    print("  Check:")
    print("    • PostgreSQL service is running")
    print("    • DATABASE_URL in .env is correct")
    print("    • Host, port, username and password are right")
    print("    • The database exists (createdb <dbname>)")
    print("─" * 60 + "\n")
    sys.exit(1)


# ── Lifespan helpers ──────────────────────────────────────────────────────────
async def init_db() -> None:
    from Modules.database import db_models  # noqa: F401 — registers all ORM classes with Base.metadata
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def close_db() -> None:
    await engine.dispose()
