#!/bin/bash
set -e

echo "🐳 Building Lambda package using Docker..."

# Clean previous builds
rm -rf package lambda-package.zip

# Build dependencies in Docker container
docker build -f Dockerfile.build -t lambda-builder .
docker create --name lambda-temp lambda-builder
docker cp lambda-temp:/package ./package
docker rm lambda-temp

echo "📦 Copying Lambda code..."

# Copy Lambda code
cp lambda_function.py config.py package/
cp -r database utils package/

echo "🗜️  Creating deployment package..."

# Create zip
cd package
zip -r ../lambda-package.zip . -q
cd ..

# Show size
du -h lambda-package.zip

echo "✅ Done! Deploy with:"
echo "   aws lambda update-function-code --function-name doctalk-document-processor --zip-file fileb://lambda-package.zip"
