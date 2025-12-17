# Lambda Deployment Guide

This guide shows you how to deploy the simplified LangChain-based Lambda function to AWS.

## Prerequisites

Before deploying, ensure you've completed the infrastructure setup:
- ✅ Lambda function `doctalk-document-processor` created (see `docs/aws-infrastructure-setup.md` Step 7)
- ✅ IAM role with proper permissions attached
- ✅ VPC, subnets, and security groups configured
- ✅ SQS trigger connected
- ✅ RDS PostgreSQL with pgvector ready

## Quick Deploy (3 Steps)

### Step 1: Package the Lambda Function

```bash
cd lambda

# Make the script executable (first time only)
chmod +x package.sh

# Run the packaging script
./package.sh
```

This creates `lambda-package.zip` with all dependencies.

**Windows Users:**
```bash
# If you don't have bash, use Git Bash or WSL
# Or manually run:
pip install -r requirements.txt -t package/ --platform manylinux2014_x86_64 --only-binary=:all:
cp lambda_function.py config.py package/
cp -r database utils package/
cd package && zip -r ../lambda-package.zip . && cd ..
```

### Step 2: Set Environment Variables

Go to [Lambda Console](https://console.aws.amazon.com/lambda) → `doctalk-document-processor` → **Configuration** → **Environment variables** → **Edit**

Add these variables:

| Variable | Value | Where to find it |
|----------|-------|------------------|
| `AWS_REGION` | `us-east-1` | Your AWS region |
| `S3_BUCKET_NAME` | `doctalk-documents-123456789` | From S3 console |
| `DB_HOST` | `doctalk-db.xyz.us-east-1.rds.amazonaws.com` | RDS endpoint (from RDS console) |
| `DB_PORT` | `5432` | PostgreSQL default port |
| `DB_NAME` | `doctalk` | Database name |
| `DB_USER` | `postgres` | Master username |
| `DB_PASSWORD` | `your-secure-password` | Master password you set |
| `OPENAI_API_KEY` | `sk-proj-...` | From [OpenAI dashboard](https://platform.openai.com/api-keys) |

**Or via AWS CLI:**
```bash
aws lambda update-function-configuration \
  --function-name doctalk-document-processor \
  --environment "Variables={
    AWS_REGION=us-east-1,
    S3_BUCKET_NAME=doctalk-documents-123456789,
    DB_HOST=doctalk-db.xyz.us-east-1.rds.amazonaws.com,
    DB_PORT=5432,
    DB_NAME=doctalk,
    DB_USER=postgres,
    DB_PASSWORD=your-password,
    OPENAI_API_KEY=sk-proj-your-key
  }"
```

### Step 3: Deploy the Code

**Option A: Via AWS Console**

1. Go to [Lambda Console](https://console.aws.amazon.com/lambda)
2. Select `doctalk-document-processor`
3. **Code** tab → **Upload from** → **.zip file**
4. Select `lambda-package.zip`
5. Click **Save**

**Option B: Via AWS CLI** (Recommended)

```bash
# If package is < 50MB
aws lambda update-function-code \
  --function-name doctalk-document-processor \
  --zip-file fileb://lambda-package.zip

# If package is > 50MB, upload to S3 first
aws s3 cp lambda-package.zip s3://YOUR-BUCKET/lambda-package.zip
aws lambda update-function-code \
  --function-name doctalk-document-processor \
  --s3-bucket YOUR-BUCKET \
  --s3-key lambda-package.zip
```

**Wait for deployment:**
```bash
aws lambda wait function-updated \
  --function-name doctalk-document-processor

echo "✅ Deployment complete!"
```

## Test the Deployment

### Test 1: Manual Invocation

Create a test event in Lambda Console:

1. Go to **Test** tab
2. Create new test event:
   - **Event name**: `test-document-upload`
   - **Template**: SQS
   - Replace with:

```json
{
  "Records": [
    {
      "messageId": "test-message-id",
      "body": "{\"Records\":[{\"s3\":{\"bucket\":{\"name\":\"doctalk-documents-123456789\"},\"object\":{\"key\":\"uploads/user123/test.pdf\"}}}]}"
    }
  ]
}
```

3. Click **Test**
4. Check the execution results and logs

### Test 2: Real Upload

1. Upload a test PDF to S3:
```bash
aws s3 cp test.pdf s3://doctalk-documents-123456789/uploads/test-user/test.pdf
```

2. Check SQS queue for message
3. Monitor Lambda execution in CloudWatch Logs
4. Verify document status in database:
```sql
SELECT id, filename, status, chunk_count
FROM documents
WHERE filename = 'test.pdf';
```

## Monitoring

### CloudWatch Logs

View logs:
```bash
# Get recent log streams
aws logs describe-log-streams \
  --log-group-name /aws/lambda/doctalk-document-processor \
  --order-by LastEventTime \
  --descending \
  --max-items 5

# Tail logs (requires aws-cli v2)
aws logs tail /aws/lambda/doctalk-document-processor --follow
```

Or use CloudWatch Logs Insights:
1. Go to [CloudWatch Console](https://console.aws.amazon.com/cloudwatch)
2. **Logs** → **Insights**
3. Select log group: `/aws/lambda/doctalk-document-processor`
4. Query:
```
fields @timestamp, @message
| filter @message like /ERROR/
| sort @timestamp desc
| limit 20
```

### Metrics to Watch

**Lambda Console** → `doctalk-document-processor` → **Monitor** tab:
- **Invocations**: Should match documents uploaded
- **Errors**: Should be 0 or very low
- **Duration**: Typical 10-60 seconds per document
- **Throttles**: Should be 0

**Cost monitoring:**
```bash
# Estimated invocation count
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=doctalk-document-processor \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-31T23:59:59Z \
  --period 86400 \
  --statistics Sum
```

## Troubleshooting

### Common Issues

#### 1. "Configuration error: Missing required environment variables"

**Fix:** Set all environment variables in Lambda Configuration
```bash
aws lambda get-function-configuration \
  --function-name doctalk-document-processor \
  --query 'Environment.Variables'
```

#### 2. "Unable to import module 'lambda_function'"

**Cause:** Package structure is incorrect or dependencies missing

**Fix:** Rebuild package
```bash
rm -rf package lambda-package.zip
./package.sh
```

#### 3. "Task timed out after 3.00 seconds"

**Cause:** Lambda timeout too short

**Fix:** Increase timeout (Configuration → General configuration → Timeout → 10 minutes)

#### 4. Database connection timeout

**Causes:**
- Lambda not in correct VPC/subnets
- Security group not allowing Lambda → RDS
- Wrong DB_HOST endpoint

**Fix:**
```bash
# Check VPC config
aws lambda get-function-configuration \
  --function-name doctalk-document-processor \
  --query 'VpcConfig'

# Test DB connection from Lambda
# Create a test handler that just connects to DB
```

#### 5. "No module named 'langchain'"

**Cause:** Dependencies not packaged for Lambda (Linux x86_64)

**Fix:** Rebuild with platform flag
```bash
pip install -r requirements.txt -t package/ \
  --platform manylinux2014_x86_64 \
  --only-binary=:all:
```

#### 6. OpenAI API errors

**Causes:**
- Invalid API key
- Rate limit exceeded
- No credits

**Fix:**
1. Check API key at https://platform.openai.com/api-keys
2. Check usage limits
3. Add credits if needed

### Debug Mode

Enable detailed logging:

```python
# Edit config.py, add:
import logging
logging.basicConfig(level=logging.DEBUG)
```

Then redeploy.

## Updating the Lambda

When you make code changes:

```bash
# 1. Edit your code (lambda_function.py, config.py, etc.)

# 2. Repackage
./package.sh

# 3. Deploy
aws lambda update-function-code \
  --function-name doctalk-document-processor \
  --zip-file fileb://lambda-package.zip

# 4. Wait for update
aws lambda wait function-updated \
  --function-name doctalk-document-processor
```

## Rollback

If something goes wrong:

```bash
# List versions
aws lambda list-versions-by-function \
  --function-name doctalk-document-processor

# Publish current as version
aws lambda publish-version \
  --function-name doctalk-document-processor

# Update alias to point to previous version
aws lambda update-alias \
  --function-name doctalk-document-processor \
  --name production \
  --function-version 1
```

## Production Checklist

Before going to production:

- [ ] Enable CloudWatch detailed monitoring
- [ ] Set up CloudWatch alarms (errors, duration, throttles)
- [ ] Configure reserved concurrency (prevent OpenAI rate limits)
- [ ] Enable X-Ray tracing for debugging
- [ ] Set up dead letter queue monitoring
- [ ] Review and increase Lambda timeout if needed
- [ ] Test with various document sizes and types
- [ ] Enable RDS backups
- [ ] Move RDS to private subnets
- [ ] Enable Lambda function versioning
- [ ] Set up CI/CD pipeline (GitHub Actions, etc.)

## Next Steps

Once deployed:
1. Test document upload from your Next.js app
2. Monitor CloudWatch Logs for first few uploads
3. Verify chunks are created in database
4. Implement embedding generation in Next.js (or move to Lambda)
5. Build chat interface with RAG

## Need Help?

Check these resources:
- Lambda logs in CloudWatch
- SQS dead letter queue for failed messages
- RDS query logs
- `lambda/README.md` for local testing

Happy deploying! 🚀
