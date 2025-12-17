# DocTalk Document Processor Lambda

Simplified AWS Lambda function for processing documents using LangChain.

## 🚀 Quick Links

- **[QUICKSTART.md](./QUICKSTART.md)** - Deploy in 3 commands
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Full deployment guide
- **[aws-infrastructure-setup.md](../docs/aws-infrastructure-setup.md)** - Infrastructure setup

## Overview

This Lambda function is triggered by SQS messages when documents are uploaded to S3. It:
1. Downloads the document from S3
2. Parses using LangChain document loaders
3. Splits into chunks using LangChain text splitters
4. Generates embeddings via OpenAI
5. Stores chunks with embeddings in PostgreSQL

## Architecture

**Simplified with LangChain** - No custom parsers, chunkers, or embedding logic!

```
S3 Upload → SQS Event → Lambda Handler
                            ↓
                    LangChain Loaders (PDF/DOCX/TXT/MD)
                            ↓
                    RecursiveCharacterTextSplitter
                            ↓
                    OpenAI Embeddings
                            ↓
                    PostgreSQL (pgvector)
```

## Supported Document Types

- **PDF** - `PyPDFLoader`
- **DOCX** - `Docx2txtLoader`
- **TXT** - `TextLoader`
- **Markdown** - `UnstructuredMarkdownLoader`

## Dependencies

```
langchain==0.1.0
langchain-community==0.0.13
langchain-openai==0.0.2
boto3==1.35.0
psycopg2-binary==2.9.9
pypdf==3.17.4
python-docx==1.1.0
unstructured==0.11.8
```

## Environment Variables

### For AWS Lambda (Production)

Set these in the Lambda Console under **Configuration → Environment variables**:

| Variable | Example Value | Description |
|----------|--------------|-------------|
| `AWS_REGION` | `us-east-1` | AWS region |
| `S3_BUCKET_NAME` | `doctalk-documents-123456789` | S3 bucket for documents |
| `DB_HOST` | `doctalk.xyz.us-east-1.rds.amazonaws.com` | RDS endpoint |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_NAME` | `doctalk` | Database name |
| `DB_USER` | `postgres` | Database user |
| `DB_PASSWORD` | `your-secure-password` | Database password |
| `OPENAI_API_KEY` | `sk-...` | OpenAI API key |

**Via AWS Console:**
1. Open [Lambda Console](https://console.aws.amazon.com/lambda)
2. Select `doctalk-document-processor`
3. Configuration → Environment variables → Edit
4. Add all variables above

**Via AWS CLI:**
```bash
aws lambda update-function-configuration \
  --function-name doctalk-document-processor \
  --environment "Variables={AWS_REGION=us-east-1,S3_BUCKET_NAME=doctalk-documents-123456789,DB_HOST=your-rds.us-east-1.rds.amazonaws.com,DB_PORT=5432,DB_NAME=doctalk,DB_USER=postgres,DB_PASSWORD=your-password,OPENAI_API_KEY=sk-your-key}"
```

### For Local Testing

Create a `.env` file (copy from `.env.example`):

```bash
cp .env.example .env
```

Then edit `.env` with your local values. The file is automatically loaded by `config.py`.

## Deployment

### Option 1: Package & Deploy (Recommended)

```bash
# Package the Lambda function
cd lambda
./package.sh

# Deploy using AWS CLI
aws lambda update-function-code \
  --function-name doctalk-document-processor \
  --zip-file fileb://lambda-package.zip
```

### Option 2: Deploy with SAM/CDK/Terraform

See your infrastructure-as-code configuration for deployment details.

## Configuration

Edit `config.py` to adjust:

- **Chunk Size**: Default 1000 characters (~250 tokens)
- **Chunk Overlap**: Default 200 characters
- **Embedding Model**: Default `text-embedding-3-small` (1536 dimensions)

## Local Testing

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Create .env file from example
cp .env.example .env

# 3. Edit .env with your local values
# (DB_HOST=localhost, your OPENAI_API_KEY, etc.)

# 4. Update test_event.json with a real S3 key from your database

# 5. Run the test script
python test_local.py
```

The `.env` file is automatically loaded by `config.py` when running locally.

## Performance

- **Memory**: Recommend 512MB-1GB (depends on document size)
- **Timeout**: Recommend 5 minutes (large PDFs can take time)
- **Concurrency**: Adjust based on OpenAI rate limits

## Error Handling

The Lambda function:
- Updates document status to `processing` at start
- Updates to `ready` on success with page/chunk counts
- Updates to `failed` on error with error message
- Cleans up temporary files in `/tmp`

## Logging

Structured logging with Python's logging module:
- INFO: Normal processing steps
- WARNING: Recoverable issues
- ERROR: Failures with stack traces
- Extra context: document_id, s3_key, chunk_count, etc.

View logs in CloudWatch Logs group: `/aws/lambda/doctalk-document-processor`

## Database Schema

Expected tables:

```sql
-- Documents table
CREATE TABLE documents (
  id UUID PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  filename VARCHAR(255) NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  file_size INTEGER NOT NULL,
  s3_key VARCHAR(500) NOT NULL UNIQUE,
  status VARCHAR(50) NOT NULL,
  error_message TEXT,
  page_count INTEGER,
  chunk_count INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Document chunks with pgvector
CREATE TABLE document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(1536),  -- text-embedding-3-small dimension
  chunk_index INTEGER NOT NULL,
  page_number INTEGER,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_chunks_document_id ON document_chunks(document_id);
CREATE INDEX idx_chunks_embedding ON document_chunks USING ivfflat (embedding vector_cosine_ops);
```

## Troubleshooting

### ImportError: No module named 'langchain'
- Ensure dependencies are packaged in the Lambda deployment package
- Check that the package was built for Linux x86_64 architecture

### OpenAI rate limit errors
- Reduce concurrent Lambda executions
- Implement exponential backoff (already included in langchain-openai)
- Consider upgrading OpenAI plan

### Database connection timeout
- Ensure Lambda is in the same VPC as RDS
- Check security group rules allow PostgreSQL port 5432
- Verify RDS endpoint is correct

### Large PDF processing timeout
- Increase Lambda timeout (max 15 minutes)
- Increase Lambda memory (faster processing)
- Consider splitting very large PDFs

## Cost Optimization

- Use reserved concurrency to control OpenAI API costs
- Enable S3 Intelligent-Tiering for document storage
- Use RDS autoscaling for database capacity
- Monitor CloudWatch metrics for optimization opportunities
