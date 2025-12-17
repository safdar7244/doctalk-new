#!/bin/bash

# DocTalk Lambda Deployment Package Script
# Packages the Lambda function with all dependencies for deployment

set -e  # Exit on error

echo "🚀 Packaging DocTalk Lambda function..."

# Clean up previous builds
echo "🧹 Cleaning up previous builds..."
rm -rf package lambda-package.zip

# Create package directory
echo "📦 Creating package directory..."
mkdir -p package

# Install dependencies to package directory
echo "📥 Installing Python dependencies..."
pip install -r requirements.txt -t package/ --platform manylinux2014_x86_64 --only-binary=:all:

# Copy Lambda function code to package
echo "📋 Copying Lambda function code..."
cp lambda_function.py package/
cp config.py package/
cp -r database package/
cp -r utils package/

# Create deployment package
echo "🗜️  Creating deployment package..."
cd package
zip -r ../lambda-package.zip . -q
cd ..

# Get package size
PACKAGE_SIZE=$(du -h lambda-package.zip | cut -f1)
echo "✅ Package created: lambda-package.zip ($PACKAGE_SIZE)"

# Check if package is too large for direct upload (50MB limit)
PACKAGE_SIZE_BYTES=$(stat -f%z lambda-package.zip 2>/dev/null || stat -c%s lambda-package.zip 2>/dev/null)
if [ $PACKAGE_SIZE_BYTES -gt 52428800 ]; then
    echo "⚠️  Warning: Package is larger than 50MB ($PACKAGE_SIZE)"
    echo "   You'll need to upload to S3 and deploy from there."
    echo ""
    echo "   Upload to S3:"
    echo "   aws s3 cp lambda-package.zip s3://YOUR-BUCKET/lambda-package.zip"
    echo ""
    echo "   Deploy from S3:"
    echo "   aws lambda update-function-code \\"
    echo "     --function-name doctalk-document-processor \\"
    echo "     --s3-bucket YOUR-BUCKET \\"
    echo "     --s3-key lambda-package.zip"
else
    echo ""
    echo "📤 Deploy with:"
    echo "   aws lambda update-function-code \\"
    echo "     --function-name doctalk-document-processor \\"
    echo "     --zip-file fileb://lambda-package.zip"
fi

echo ""
echo "✨ Done!"
