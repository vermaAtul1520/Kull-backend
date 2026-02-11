# KULL Backend - AWS Serverless Migration Guide

## Overview

This guide documents the migration of KULL Backend from Render to AWS Serverless (Lambda + API Gateway + S3).

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   React Native  │────▶│  API Gateway    │────▶│  AWS Lambda     │
│   Mobile App    │     │  (REST API)     │     │  (Node.js 20)   │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                        ┌────────────────────────────────┼────────────────────────────────┐
                        │                                │                                │
                        ▼                                ▼                                ▼
               ┌─────────────────┐              ┌─────────────────┐              ┌─────────────────┐
               │   MongoDB Atlas │              │   Amazon S3     │              │  Secrets Manager│
               │   (Database)    │              │  (File Storage) │              │  (Credentials)  │
               └─────────────────┘              └─────────────────┘              └─────────────────┘
```

## Component Mapping

| Render Feature | AWS Serverless Equivalent |
|----------------|---------------------------|
| Web Service | AWS Lambda + Amazon API Gateway |
| `/uploads` folder | Amazon S3 |
| Environment Variables | AWS Secrets Manager / SSM Parameter Store |
| `index.js` (listen) | `lambda.js` (serverless-express handler) |
| Background Workers | AWS Step Functions or SQS-triggered Lambda |

## Files Created/Modified

### New Files

1. **`lambda.js`** - Lambda entry point using `@codegenie/serverless-express`
2. **`template.yaml`** - SAM template defining AWS resources
3. **`samconfig.toml`** - SAM CLI configuration for deployments
4. **`middleware/uploadS3.js`** - S3-based file upload middleware
5. **`scripts/setup-aws-secrets.sh`** - Script to set up AWS secrets

### Modified Files

1. **`index.js`** - Conditionally starts server (not in Lambda), exports app
2. **`config/database.js`** - Connection caching for Lambda
3. **`middleware/upload.js`** - Auto-switches to S3 in Lambda environment
4. **`package.json`** - Added AWS SDK dependencies

## Prerequisites

1. **AWS CLI** installed and configured
2. **SAM CLI** installed (`brew install aws-sam-cli` on macOS)
3. **Docker** (for local testing)
4. **MongoDB Atlas** (ensure IP whitelist includes `0.0.0.0/0` for Lambda)

## Deployment Steps

### 1. Set Up AWS Secrets

```bash
# Make the script executable
chmod +x scripts/setup-aws-secrets.sh

# Run for production
./scripts/setup-aws-secrets.sh prod ap-south-1

# Or for development
./scripts/setup-aws-secrets.sh dev ap-south-1
```

This will prompt you to enter:
- `MONGO_URI` - MongoDB connection string
- `JWT_SECRET` - JWT signing secret
- `SENDGRID_API_KEY` - SendGrid API key
- `SUPER_ADMIN_EMAIL` - Admin notification email

### 2. Update template.yaml with Secrets

After running the secrets script, update `template.yaml` Environment section:

```yaml
Environment:
  Variables:
    NODE_ENV: production
    S3_BUCKET_NAME: !Ref KullUploadsBucket
    AWS_S3_REGION: !Ref AWS::Region
    MONGO_URI: '{{resolve:secretsmanager:kull/prod/MONGO_URI}}'
    JWT_SECRET: '{{resolve:secretsmanager:kull/prod/JWT_SECRET}}'
    SENDGRID_API_KEY: '{{resolve:secretsmanager:kull/prod/SENDGRID_API_KEY}}'
    SUPER_ADMIN_EMAIL: '{{resolve:ssm:/kull/prod/SUPER_ADMIN_EMAIL}}'
```

### 3. Build the Application

```bash
sam build
```

### 4. Test Locally (Optional)

```bash
# Start local API
sam local start-api

# Test a specific endpoint
curl http://localhost:3000/api/health
```

### 5. Deploy to AWS

```bash
# First-time deployment (guided)
sam deploy --guided

# Subsequent deployments
sam deploy

# Deploy to specific environment
sam deploy --config-env dev
sam deploy --config-env staging
sam deploy --config-env prod
```

### 6. Get API Endpoint

After deployment, SAM will output the API Gateway URL:

```
Outputs:
  ApiEndpoint: https://xxxxxxxxxx.execute-api.ap-south-1.amazonaws.com/prod
```

### 7. Update Mobile App

Update your React Native app's base URL:

```javascript
// config.js
const API_BASE_URL = 'https://xxxxxxxxxx.execute-api.ap-south-1.amazonaws.com/prod';
```

## Environment Variables

### Secrets Manager (Sensitive)
- `MONGO_URI` - MongoDB connection string
- `JWT_SECRET` - JWT signing secret
- `SENDGRID_API_KEY` - Email service API key

### SSM Parameter Store (Non-Sensitive)
- `SUPER_ADMIN_EMAIL` - Admin email for notifications
- `NODE_ENV` - Environment name

### Lambda Environment (Auto-Set)
- `S3_BUCKET_NAME` - Created S3 bucket name
- `AWS_S3_REGION` - AWS region
- `AWS_LAMBDA_FUNCTION_NAME` - Auto-set by Lambda

## File Uploads

Files are now stored in S3 instead of local `/uploads` folder:

| Local Path | S3 Path |
|------------|---------|
| `/uploads/communities/` | `s3://kull-uploads-prod-xxx/communities/` |
| `/uploads/content/` | `s3://kull-uploads-prod-xxx/content/` |
| `/uploads/avatars/` | `s3://kull-uploads-prod-xxx/avatars/` |

### File URL Format

```
https://kull-uploads-prod-xxx.s3.ap-south-1.amazonaws.com/avatars/1234567890-abc123.jpg
```

## MongoDB Considerations

### Connection Pooling
- Lambda uses smaller connection pool (max: 10) vs standard (max: 50)
- Connections are cached across warm Lambda invocations

### IP Whitelisting
Since Lambda IPs are dynamic, you must either:
1. Whitelist `0.0.0.0/0` in MongoDB Atlas (less secure)
2. Use AWS PrivateLink with MongoDB Atlas (recommended for production)
3. Deploy Lambda in VPC with NAT Gateway (more complex)

## Monitoring & Logs

### CloudWatch Logs
```bash
# View logs
sam logs -n KullFunction --stack-name kull-backend-prod --tail

# Filter by time
sam logs -n KullFunction --stack-name kull-backend-prod --start-time '10min ago'
```

### CloudWatch Metrics
- Invocations
- Duration
- Errors
- Throttles

## Cost Estimation

| Resource | Free Tier | Estimated Monthly Cost |
|----------|-----------|------------------------|
| Lambda | 1M requests, 400K GB-seconds | ~$0-20 |
| API Gateway | 1M API calls | ~$3.50 per million |
| S3 | 5GB storage | ~$0.023 per GB |
| Secrets Manager | - | $0.40 per secret |

## Rollback

```bash
# Rollback to previous deployment
aws cloudformation rollback-stack --stack-name kull-backend-prod

# Delete stack entirely
sam delete --stack-name kull-backend-prod
```

## Troubleshooting

### Cold Start Issues
- Increase Lambda memory (improves CPU allocation)
- Use Provisioned Concurrency for critical endpoints

### Timeout Errors
- Default timeout is 30 seconds
- Increase in `template.yaml` if needed (max 900 seconds)

### Binary/File Upload Issues
- Ensure `BinaryMediaTypes: ['*/*']` is set in API Gateway
- Check S3 bucket permissions

### MongoDB Connection Errors
- Verify IP whitelist in MongoDB Atlas
- Check connection string format
- Ensure `context.callbackWaitsForEmptyEventLoop = false` is set

## Support

For issues specific to this migration, check:
1. CloudWatch Logs for Lambda errors
2. API Gateway execution logs
3. S3 access logs
