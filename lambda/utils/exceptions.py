"""
Custom exception classes for DocTalk Lambda document processor.

Provides specific exception types for different error scenarios to enable
appropriate error handling and retry logic.
"""


class DocTalkException(Exception):
    """Base exception for all DocTalk Lambda errors."""
    pass


class ValidationError(DocTalkException):
    """
    Raised when input validation fails.

    Examples:
    - Invalid file type
    - Missing required metadata
    - File size exceeds limit
    - Invalid document status

    These errors should not be retried as they indicate client-side issues.
    """
    pass


class S3DownloadError(DocTalkException):
    """
    Raised when S3 file download fails.

    Examples:
    - File not found in S3
    - Access denied
    - S3 service unavailable

    Some errors may be transient and worth retrying.
    """
    pass


class ParsingError(DocTalkException):
    """
    Raised when document parsing fails.

    Examples:
    - Corrupted PDF file
    - Unsupported document format
    - Malformed DOCX structure
    - Encoding errors

    These errors typically indicate issues with the document itself
    and should not be retried.
    """
    pass


class ChunkingError(DocTalkException):
    """
    Raised when text chunking fails.

    Examples:
    - Token encoding errors
    - Invalid text format
    - Chunking algorithm failures

    These are typically not transient and should not be retried.
    """
    pass


class EmbeddingError(DocTalkException):
    """
    Raised when embedding generation fails.

    Examples:
    - OpenAI API errors (non-rate-limit)
    - Invalid input text
    - Embedding dimension mismatch

    Some errors (like rate limits) should be retried with backoff,
    while others should fail immediately.
    """
    pass


class DatabaseError(DocTalkException):
    """
    Raised when database operations fail.

    Examples:
    - Connection failures
    - Query execution errors
    - Transaction failures
    - Constraint violations

    Connection errors may be transient and worth retrying,
    while constraint violations should fail immediately.
    """
    pass


class ConfigurationError(DocTalkException):
    """
    Raised when configuration is invalid or incomplete.

    Examples:
    - Missing environment variables
    - Invalid configuration values
    - AWS credentials issues

    These errors indicate deployment/setup problems and should not be retried.
    """
    pass
