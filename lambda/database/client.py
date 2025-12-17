"""
Database connection management for DocTalk Lambda document processor.

Manages PostgreSQL connections with connection reuse optimization for Lambda.
"""
import psycopg2
from psycopg2.extensions import connection as Connection
from typing import Optional

from config import Config
from utils.logger import get_logger
from utils.exceptions import DatabaseError

logger = get_logger(__name__)

# Global connection for reuse across Lambda invocations
_global_connection: Optional[Connection] = None


def get_db_connection() -> Connection:
    """
    Get a PostgreSQL database connection.

    Lambda best practice: Reuse connections across invocations by storing
    in global scope. This significantly reduces cold start overhead.

    Returns:
        psycopg2 connection object

    Raises:
        DatabaseError: If connection fails
    """
    global _global_connection

    try:
        # Check if we have an existing connection
        if _global_connection is not None:
            # Verify connection is still alive
            try:
                _global_connection.isolation_level
                logger.debug("Reusing existing database connection")
                return _global_connection
            except (psycopg2.OperationalError, psycopg2.InterfaceError):
                # Connection is dead, close it and create new one
                logger.info("Existing connection is dead, creating new connection")
                try:
                    _global_connection.close()
                except Exception:
                    pass
                _global_connection = None

        # Create new connection
        logger.info("Creating new database connection")

        connection_params = {
            'host': Config.DB_HOST,
            'port': Config.DB_PORT,
            'dbname': Config.DB_NAME,
            'user': Config.DB_USER,
            'password': Config.DB_PASSWORD,
            'connect_timeout': 10,
            'sslmode': 'require'  # Required for AWS RDS
        }

        _global_connection = psycopg2.connect(**connection_params)

        # Set connection parameters
        _global_connection.set_session(autocommit=False)

        logger.info("Database connection established successfully")
        return _global_connection

    except psycopg2.OperationalError as e:
        error_msg = f"Failed to connect to database: {str(e)}"
        logger.error(error_msg, exc_info=True)
        raise DatabaseError(error_msg)

    except Exception as e:
        error_msg = f"Unexpected database connection error: {str(e)}"
        logger.error(error_msg, exc_info=True)
        raise DatabaseError(error_msg)


def close_connection() -> None:
    """
    Close the global database connection.

    This should typically only be called during testing or in error scenarios.
    Lambda will automatically clean up connections when the execution environment
    is terminated.
    """
    global _global_connection

    if _global_connection is not None:
        try:
            _global_connection.close()
            logger.info("Database connection closed")
        except Exception as e:
            logger.warning(f"Error closing database connection: {str(e)}")
        finally:
            _global_connection = None


def test_connection() -> bool:
    """
    Test database connection by executing a simple query.

    Returns:
        True if connection is working

    Raises:
        DatabaseError: If connection test fails
    """
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("SELECT 1")
            result = cur.fetchone()
            if result and result[0] == 1:
                logger.info("Database connection test successful")
                return True
            else:
                raise DatabaseError("Unexpected result from connection test")

    except Exception as e:
        error_msg = f"Database connection test failed: {str(e)}"
        logger.error(error_msg, exc_info=True)
        raise DatabaseError(error_msg)
