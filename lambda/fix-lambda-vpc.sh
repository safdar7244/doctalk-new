#!/bin/bash
# Fix Lambda VPC configuration to connect to RDS

echo "Removing Lambda from VPC to allow connection to public RDS..."

aws lambda update-function-configuration \
  --function-name doctalk-document-processor \
  --vpc-config SubnetIds=[],SecurityGroupIds=[]

echo "Waiting for update to complete..."
aws lambda wait function-updated --function-name doctalk-document-processor

echo "✅ Lambda VPC configuration removed!"
echo ""
echo "Your Lambda can now connect to RDS via its public endpoint:"
echo "doctalk-db.c6dmw60g4elb.us-east-1.rds.amazonaws.com:5432"
echo ""
echo "Test the connection by uploading a document or invoking the Lambda manually."
