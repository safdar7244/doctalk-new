"""
DocTalk Lambda Document Processor - Simplified with LangChain

Handles S3 event triggers for document processing:
1. Download document from S3
2. Parse using LangChain document loaders
3. Split into chunks using LangChain text splitters
4. Generate embeddings using OpenAI
5. Store chunks with embeddings in PostgreSQL

Triggered by SQS messages from S3 events.
"""
import json
import os
import tempfile
from typing import List, Dict, Any

import boto3
from langchain_community.document_loaders import (
    PyPDFLoader,
    Docx2txtLoader,
    TextLoader,
    UnstructuredMarkdownLoader
)
from langchain_openai import OpenAIEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter

from config import Config
from database.operations import (
    get_document_by_s3_key,
    update_document_status,
    bulk_insert_chunks
)
from utils.logger import get_logger
from utils.exceptions import ParsingError, DatabaseError

logger = get_logger(__name__)

# Initialize AWS S3 client
s3_client = boto3.client('s3', region_name=Config.AWS_REGION)


def get_loader_for_file_type(file_path: str, file_type: str):
    """
    Get appropriate LangChain document loader for file type.

    Args:
        file_path: Path to the downloaded file
        file_type: MIME type of the file

    Returns:
        LangChain document loader instance

    Raises:
        ParsingError: If file type is not supported
    """
    loaders = {
        'application/pdf': PyPDFLoader,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': Docx2txtLoader,
        'text/plain': TextLoader,
        'text/markdown': UnstructuredMarkdownLoader,
    }

    loader_class = loaders.get(file_type)
    if not loader_class:
        raise ParsingError(f"Unsupported file type: {file_type}")

    try:
        return loader_class(file_path)
    except Exception as e:
        raise ParsingError(f"Failed to initialize loader for {file_type}: {str(e)}")


def download_from_s3(bucket: str, key: str) -> str:
    """
    Download file from S3 to Lambda's /tmp directory.

    Args:
        bucket: S3 bucket name
        key: S3 object key

    Returns:
        Path to downloaded file

    Raises:
        Exception: If download fails
    """
    # Create temp file with appropriate extension
    file_extension = os.path.splitext(key)[1]
    temp_file = tempfile.NamedTemporaryFile(
        delete=False,
        suffix=file_extension,
        dir='/tmp'
    )
    temp_path = temp_file.name
    temp_file.close()

    logger.info(f"Downloading s3://{bucket}/{key} to {temp_path}")
    s3_client.download_file(bucket, key, temp_path)

    return temp_path


def process_document(
    document_id: str,
    s3_key: str,
    file_type: str
) -> Dict[str, Any]:
    """
    Process a single document: parse, chunk, embed, and store.

    Args:
        document_id: UUID of document in database
        s3_key: S3 key where document is stored
        file_type: MIME type of the document

    Returns:
        Dictionary with processing results

    Raises:
        ParsingError: If document parsing fails
        DatabaseError: If database operations fail
    """
    temp_file_path = None

    try:
        # Update status to processing
        update_document_status(document_id, 'processing')

        # Download file from S3
        temp_file_path = download_from_s3(Config.S3_BUCKET_NAME, s3_key)
        logger.info(f"Downloaded document to {temp_file_path}")

        # Load document using LangChain loader
        loader = get_loader_for_file_type(temp_file_path, file_type)
        documents = loader.load()

        if not documents:
            raise ParsingError("No content extracted from document")

        logger.info(f"Loaded {len(documents)} pages/sections from document")

        # Split documents into chunks using LangChain text splitter
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=Config.CHUNK_SIZE,
            chunk_overlap=Config.CHUNK_OVERLAP,
            length_function=len,
            separators=["\n\n", "\n", ". ", " ", ""]
        )

        chunks = text_splitter.split_documents(documents)
        logger.info(f"Split into {len(chunks)} chunks")

        if not chunks:
            raise ParsingError("No chunks created from document")

        # Generate embeddings using OpenAI
        embeddings_model = OpenAIEmbeddings(
            openai_api_key=Config.OPENAI_API_KEY,
            model=Config.OPENAI_EMBEDDING_MODEL
        )

        # Extract texts for embedding
        texts = [chunk.page_content for chunk in chunks]

        # Generate embeddings in batches
        logger.info(f"Generating embeddings for {len(texts)} chunks")
        embeddings = embeddings_model.embed_documents(texts)

        # Prepare chunks for database insertion
        db_chunks = []
        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            # Extract page number from metadata if available
            page_number = chunk.metadata.get('page', chunk.metadata.get('page_number', 1))

            db_chunks.append({
                'content': chunk.page_content,
                'embedding': embedding,
                'chunk_index': i,
                'page_number': page_number,
                'metadata': {
                    'source': chunk.metadata.get('source', ''),
                    'total_chunks': len(chunks),
                    **chunk.metadata
                }
            })

        # Store chunks in database
        logger.info(f"Storing {len(db_chunks)} chunks in database")
        chunk_count = bulk_insert_chunks(document_id, db_chunks)

        # Calculate page count from documents
        page_numbers = set()
        for chunk in chunks:
            page_num = chunk.metadata.get('page', chunk.metadata.get('page_number'))
            if page_num:
                page_numbers.add(page_num)

        page_count = max(page_numbers) if page_numbers else len(documents)

        # Update document status to ready
        update_document_status(
            document_id,
            'ready',
            page_count=page_count,
            chunk_count=chunk_count
        )

        logger.info(
            f"Successfully processed document",
            extra={
                'document_id': document_id,
                'page_count': page_count,
                'chunk_count': chunk_count
            }
        )

        return {
            'document_id': document_id,
            'status': 'ready',
            'page_count': page_count,
            'chunk_count': chunk_count
        }

    except Exception as e:
        error_msg = str(e)
        logger.error(
            f"Failed to process document: {error_msg}",
            exc_info=True,
            extra={'document_id': document_id}
        )

        # Update document status to failed
        try:
            update_document_status(document_id, 'failed', error_message=error_msg)
        except Exception as db_error:
            logger.error(f"Failed to update error status: {str(db_error)}")

        raise

    finally:
        # Cleanup temp file
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.unlink(temp_file_path)
                logger.debug(f"Cleaned up temp file: {temp_file_path}")
            except Exception as e:
                logger.warning(f"Failed to cleanup temp file: {str(e)}")


def lambda_handler(event, context):
    """
    AWS Lambda handler for SQS-triggered document processing.

    Expects SQS messages containing S3 event notifications.

    Args:
        event: SQS event with S3 notification
        context: Lambda context

    Returns:
        Success/failure response
    """
    logger.info("Lambda function invoked", extra={'event': event})

    # Validate configuration
    try:
        Config.validate_config()
    except ValueError as e:
        logger.error(f"Configuration error: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': f'Configuration error: {str(e)}'})
        }

    results = []
    failed_count = 0

    # Process each SQS record
    for record in event.get('Records', []):
        try:
            # Parse S3 event from SQS message
            message_body = json.loads(record['body'])

            # Handle S3 test event
            if message_body.get('Event') == 's3:TestEvent':
                logger.info("Received S3 test event, skipping")
                continue

            # Extract S3 event details
            s3_event = message_body.get('Records', [{}])[0]
            s3_bucket = s3_event.get('s3', {}).get('bucket', {}).get('name')
            s3_key = s3_event.get('s3', {}).get('object', {}).get('key')

            if not s3_bucket or not s3_key:
                logger.error("Invalid S3 event: missing bucket or key")
                failed_count += 1
                continue

            logger.info(f"Processing S3 object: s3://{s3_bucket}/{s3_key}")

            # Get document metadata from database
            doc_data = get_document_by_s3_key(s3_key)

            if not doc_data:
                logger.error(f"Document not found in database for s3_key: {s3_key}")
                failed_count += 1
                continue

            # Process the document
            result = process_document(
                document_id=doc_data['id'],
                s3_key=s3_key,
                file_type=doc_data['file_type']
            )

            results.append(result)

        except Exception as e:
            logger.error(
                f"Failed to process record: {str(e)}",
                exc_info=True,
                extra={'record': record}
            )
            failed_count += 1

    # Return summary
    success_count = len(results)
    total_count = len(event.get('Records', []))

    logger.info(
        f"Batch processing complete",
        extra={
            'total': total_count,
            'success': success_count,
            'failed': failed_count
        }
    )

    return {
        'statusCode': 200 if failed_count == 0 else 207,
        'body': json.dumps({
            'message': f'Processed {success_count}/{total_count} documents',
            'results': results,
            'failed_count': failed_count
        })
    }
