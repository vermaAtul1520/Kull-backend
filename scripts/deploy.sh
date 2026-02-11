#!/bin/bash
# scripts/deploy.sh - Deployment Script for KULL Backend
# Usage: ./scripts/deploy.sh [dev|staging|prod]

set -e

ENVIRONMENT=${1:-staging}
echo "🚀 KULL Backend Deployment"
echo "=========================="
echo "Environment: $ENVIRONMENT"
echo ""

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
  echo "❌ Invalid environment. Use: dev, staging, or prod"
  exit 1
fi

# Step 1: Run tests
echo "📋 Step 1: Running tests..."
npm run test
echo "✅ Tests passed"
echo ""

# Step 2: Build SAM application
echo "📦 Step 2: Building SAM application..."
npm run sam:build
echo "✅ Build complete"
echo ""

# Step 3: Deploy to AWS
echo "☁️  Step 3: Deploying to AWS ($ENVIRONMENT)..."
npm run sam:deploy:$ENVIRONMENT
echo "✅ Deployment complete"
echo ""

# Step 4: Show deployment info
echo "📊 Deployment Summary"
echo "--------------------"
echo "Stack: kull-backend-$ENVIRONMENT"
echo "Region: ap-south-1"
echo ""

# Get API endpoint
API_URL=$(aws cloudformation describe-stacks \
  --stack-name "kull-backend-$ENVIRONMENT" \
  --query "Stacks[0].Outputs[?OutputKey=='KullApi'].OutputValue" \
  --output text 2>/dev/null || echo "N/A")

echo "API Endpoint: $API_URL"
echo ""

# Production data migration reminder
if [ "$ENVIRONMENT" == "prod" ]; then
  echo "⚠️  IMPORTANT: Don't forget to run data migration if needed:"
  echo "   npm run db:migrate:dry-run   # Preview migration"
  echo "   npm run db:migrate           # Run migration"
fi

echo ""
echo "🎉 Deployment to $ENVIRONMENT complete!"
