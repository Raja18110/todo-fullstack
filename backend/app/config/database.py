import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./todo.db")

engine = None

# If DATABASE_URL is configured for PostgreSQL, check if the host can be resolved and connected to.
if DATABASE_URL.startswith("postgresql"):
    try:
        # Create temporary engine to test connection
        temp_engine = create_engine(DATABASE_URL, pool_pre_ping=True)
        # Attempt connection test
        with temp_engine.connect() as conn:
            pass
        engine = temp_engine
        logger.info("Successfully connected to PostgreSQL database.")
    except Exception as e:
        logger.warning(f"Failed to connect to PostgreSQL ({e}). Falling back to local SQLite.")
        DATABASE_URL = "sqlite:///./todo.db"

# Create final database engine
if engine is None:
    connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
    engine = create_engine(
        DATABASE_URL,
        connect_args=connect_args
    )
    logger.info(f"Using database configuration: {DATABASE_URL}")

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()