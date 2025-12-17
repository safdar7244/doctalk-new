"""
Configuration module for DocTalk Lambda document processor.

Manages environment variables and application constants.
"""
import os
from typing import Optional

# Load .env file for local testing (ignored in Lambda)
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # dotenv not available in Lambda, which is fine


class Config:
    """Configuration settings for Lambda function."""

    # AWS Settings
    AWS_REGION = os.environ.get('AWS_REGION', 'us-east-1')
    S3_BUCKET_NAME = os.environ.get('S3_BUCKET_NAME', '')

    # Database Settings
    DB_HOST = os.environ.get('DB_HOST', '')
    DB_PORT = int(os.environ.get('DB_PORT', '5432'))
    DB_NAME = os.environ.get('DB_NAME', 'doctalk')
    DB_USER = os.environ.get('DB_USER', 'postgres')
    DB_PASSWORD = os.environ.get('DB_PASSWORD', '')

    @classmethod
    def get_database_url(cls) -> str:
        """Construct PostgreSQL connection string."""
        return f"postgresql://{cls.DB_USER}:{cls.DB_PASSWORD}@{cls.DB_HOST}:{cls.DB_PORT}/{cls.DB_NAME}"

    # OpenAI Settings
    OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', '')
    OPENAI_EMBEDDING_MODEL = 'text-embedding-3-small'  # 1536 dimensions

    # Chunking Settings (LangChain RecursiveCharacterTextSplitter)
    CHUNK_SIZE = 1000  # characters (roughly ~250 tokens)
    CHUNK_OVERLAP = 200  # characters

    # Processing Settings
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    TEMP_DIR = '/tmp'  # Lambda temp directory

    # Supported File Types
    SUPPORTED_FILE_TYPES = {
        'application/pdf': 'pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
        'text/plain': 'txt',
        'text/markdown': 'md'
    }

    @classmethod
    def validate_config(cls) -> None:
        """
        Validate that all required environment variables are set.

        Raises:
            ValueError: If required environment variables are missing.
        """
        required_vars = [
            ('S3_BUCKET_NAME', cls.S3_BUCKET_NAME),
            ('DB_HOST', cls.DB_HOST),
            ('DB_PASSWORD', cls.DB_PASSWORD),
            ('OPENAI_API_KEY', cls.OPENAI_API_KEY)
        ]

        missing = [name for name, value in required_vars if not value]

        if missing:
            raise ValueError(
                f"Missing required environment variables: {', '.join(missing)}"
            )
