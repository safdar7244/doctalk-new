@echo off
echo Building Lambda package using Docker...

REM Clean previous builds
if exist package rmdir /s /q package
if exist lambda-package.zip del lambda-package.zip

echo Building dependencies in Docker container...
docker build -f Dockerfile.build -t lambda-builder .
docker create --name lambda-temp lambda-builder
docker cp lambda-temp:/package ./package
docker rm lambda-temp

echo Copying Lambda code...
copy lambda_function.py package\
copy config.py package\
xcopy /E /I database package\database
xcopy /E /I utils package\utils

echo Creating deployment package...
cd package
powershell Compress-Archive -Path * -DestinationPath ../lambda-package.zip -Force
cd ..

echo Done! Deploy with:
echo aws lambda update-function-code --function-name doctalk-document-processor --zip-file fileb://lambda-package.zip
