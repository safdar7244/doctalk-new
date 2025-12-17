"""
Structured logging module for DocTalk Lambda document processor.

Provides JSON-formatted logging optimized for CloudWatch Logs.
"""
import json
import logging
import traceback
from datetime import datetime
from typing import Any, Dict, Optional


class JSONFormatter(logging.Formatter):
    """
    Custom formatter that outputs logs as JSON for better CloudWatch parsing.

    JSON format allows for easier searching, filtering, and analysis in CloudWatch Logs.
    """

    def format(self, record: logging.LogRecord) -> str:
        """
        Format log record as JSON string.

        Args:
            record: Log record to format

        Returns:
            JSON string with structured log data
        """
        log_data: Dict[str, Any] = {
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
        }

        # Add extra fields if present
        if hasattr(record, 'document_id'):
            log_data['document_id'] = record.document_id

        if hasattr(record, 's3_key'):
            log_data['s3_key'] = record.s3_key

        if hasattr(record, 'file_type'):
            log_data['file_type'] = record.file_type

        if hasattr(record, 'duration'):
            log_data['duration_ms'] = record.duration

        if hasattr(record, 'chunk_count'):
            log_data['chunk_count'] = record.chunk_count

        if hasattr(record, 'page_count'):
            log_data['page_count'] = record.page_count

        # Add exception information if present
        if record.exc_info:
            log_data['exception'] = {
                'type': record.exc_info[0].__name__ if record.exc_info[0] else None,
                'message': str(record.exc_info[1]) if record.exc_info[1] else None,
                'traceback': self.formatException(record.exc_info)
            }

        # Add stack trace if present
        if record.stack_info:
            log_data['stack_info'] = record.stack_info

        return json.dumps(log_data)


def get_logger(name: str, level: int = logging.INFO) -> logging.Logger:
    """
    Get a structured JSON logger for Lambda.

    Lambda automatically captures stdout/stderr to CloudWatch Logs,
    so we just need to configure the formatter.

    Args:
        name: Logger name (typically __name__ of the module)
        level: Logging level (default: INFO)

    Returns:
        Configured logger instance
    """
    logger = logging.getLogger(name)

    # Only configure if not already configured
    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(JSONFormatter())
        logger.addHandler(handler)
        logger.setLevel(level)

        # Prevent propagation to avoid duplicate logs
        logger.propagate = False

    return logger


def log_processing_start(logger: logging.Logger, document_id: str, s3_key: str, file_type: str) -> None:
    """
    Log the start of document processing with context.

    Args:
        logger: Logger instance
        document_id: Document UUID
        s3_key: S3 object key
        file_type: MIME type of the document
    """
    logger.info(
        "Starting document processing",
        extra={
            'document_id': document_id,
            's3_key': s3_key,
            'file_type': file_type
        }
    )


def log_processing_complete(
    logger: logging.Logger,
    document_id: str,
    page_count: int,
    chunk_count: int,
    duration_ms: float
) -> None:
    """
    Log successful document processing completion with metrics.

    Args:
        logger: Logger instance
        document_id: Document UUID
        page_count: Number of pages processed
        chunk_count: Number of chunks created
        duration_ms: Processing duration in milliseconds
    """
    logger.info(
        "Document processing completed successfully",
        extra={
            'document_id': document_id,
            'page_count': page_count,
            'chunk_count': chunk_count,
            'duration': duration_ms
        }
    )


def log_processing_error(
    logger: logging.Logger,
    document_id: str,
    error: Exception,
    stage: str
) -> None:
    """
    Log document processing error with context.

    Args:
        logger: Logger instance
        document_id: Document UUID
        error: Exception that occurred
        stage: Processing stage where error occurred (e.g., 'parsing', 'chunking', 'embedding')
    """
    logger.error(
        f"Document processing failed at {stage} stage",
        extra={
            'document_id': document_id,
            'stage': stage,
            'error_type': type(error).__name__,
            'error_message': str(error)
        },
        exc_info=True
    )
