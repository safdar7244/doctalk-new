# Lambda Deployment - Quick Reference

One-page guide to get your Lambda deployed fast.

## 🚀 Deploy in 3 Commands

```bash
# 1. Package
cd lambda && ./package.sh

# 2. Set environment variables (do this ONCE in AWS Console)
# See table below

# 3. Deploy
aws lambda update-function-code \
  --function-name doctalk-document-processor \
  --zip-file fileb://lambda-package.zip
```

## 📋 Environment Variables (AWS Console)

Lambda Console → `doctalk-document-processor` → Configuration → Environment variables

```
AWS_REGION          = us-east-1
S3_BUCKET_NAME      = doctalk-documents-123456789
DB_HOST             = doctalk-db.xyz.us-east-1.rds.amazonaws.com
DB_PORT             = 5432
DB_NAME             = doctalk
DB_USER             = postgres
DB_PASSWORD         = your-password
OPENAI_API_KEY      = sk-proj-your-key
```

## 🧪 Test Upload

```bash
# Upload test file
aws s3 cp test.pdf s3://doctalk-documents-123456789/uploads/test-user/test.pdf

# Watch logs
aws logs tail /aws/lambda/doctalk-document-processor --follow

# Check database
psql -h doctalk-db.xyz.us-east-1.rds.amazonaws.com -U postgres -d doctalk
SELECT filename, status, chunk_count FROM documents;
```

## 🔄 Update After Code Changes

```bash
./package.sh && \
aws lambda update-function-code \
  --function-name doctalk-document-processor \
  --zip-file fileb://lambda-package.zip
```

## ❌ Troubleshooting

| Error | Fix |
|-------|-----|
| "Missing required environment variables" | Set env vars in AWS Console |
| "Unable to import module" | Run `./package.sh` again |
| "Task timed out" | Increase timeout to 10 minutes |
| "Database connection failed" | Check VPC/security groups |
| "No module named 'langchain'" | Package with correct platform flag |

## 📚 More Details

- Full deployment guide: `DEPLOYMENT.md`
- Local testing: `README.md`
- Infrastructure setup: `../docs/aws-infrastructure-setup.md`

## 🆘 Quick Debug

```bash
# Check function config
aws lambda get-function-configuration \
  --function-name doctalk-document-processor

# View recent errors
aws logs filter-log-events \
  --log-group-name /aws/lambda/doctalk-document-processor \
  --filter-pattern "ERROR"

# Check SQS queue
aws sqs get-queue-attributes \
  --queue-url https://sqs.us-east-1.amazonaws.com/ACCOUNT_ID/doctalk-document-processing \
  --attribute-names All
```

That's it! 🎉
