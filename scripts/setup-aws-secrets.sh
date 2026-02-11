#!/bin/bash

# AWS Secrets Setup Script for KULL Backend
# This script helps you set up secrets in AWS Secrets Manager and SSM Parameter Store

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

STAGE=${1:-prod}
REGION=${2:-ap-south-1}

echo -e "${GREEN}=== KULL Backend AWS Secrets Setup ===${NC}"
echo -e "Stage: ${YELLOW}$STAGE${NC}"
echo -e "Region: ${YELLOW}$REGION${NC}"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Check if AWS credentials are configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}AWS credentials not configured. Run 'aws configure' first.${NC}"
    exit 1
fi

echo -e "${GREEN}AWS CLI configured successfully${NC}"
echo ""

# Function to create secret in Secrets Manager
create_secret() {
    local name=$1
    local description=$2
    
    echo -e "${YELLOW}Creating secret: kull/$STAGE/$name${NC}"
    
    read -sp "Enter value for $name: " value
    echo ""
    
    aws secretsmanager create-secret \
        --name "kull/$STAGE/$name" \
        --description "$description" \
        --secret-string "$value" \
        --region $REGION 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Secret created successfully${NC}"
    else
        echo -e "${YELLOW}Secret may already exist. Updating...${NC}"
        aws secretsmanager put-secret-value \
            --secret-id "kull/$STAGE/$name" \
            --secret-string "$value" \
            --region $REGION
    fi
    echo ""
}

# Function to create parameter in SSM Parameter Store
create_parameter() {
    local name=$1
    local description=$2
    local type=${3:-String}
    
    echo -e "${YELLOW}Creating parameter: /kull/$STAGE/$name${NC}"
    
    read -p "Enter value for $name: " value
    
    aws ssm put-parameter \
        --name "/kull/$STAGE/$name" \
        --description "$description" \
        --value "$value" \
        --type $type \
        --overwrite \
        --region $REGION
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Parameter created successfully${NC}"
    else
        echo -e "${RED}✗ Failed to create parameter${NC}"
    fi
    echo ""
}

echo -e "${GREEN}=== Setting up Secrets (Sensitive Data) ===${NC}"
echo ""

# Sensitive secrets - stored in Secrets Manager
create_secret "MONGO_URI" "MongoDB connection string"
create_secret "JWT_SECRET" "JWT signing secret key"
create_secret "SENDGRID_API_KEY" "SendGrid API key for emails"

echo -e "${GREEN}=== Setting up Parameters (Non-Sensitive Config) ===${NC}"
echo ""

# Non-sensitive parameters - stored in SSM Parameter Store
create_parameter "SUPER_ADMIN_EMAIL" "Super admin email for notifications"
create_parameter "NODE_ENV" "Node environment (production/staging/dev)"

echo ""
echo -e "${GREEN}=== Setup Complete! ===${NC}"
echo ""
echo "To use these secrets in your Lambda function, update your template.yaml to include:"
echo ""
echo "Environment:"
echo "  Variables:"
echo "    MONGO_URI: '{{resolve:secretsmanager:kull/$STAGE/MONGO_URI}}'"
echo "    JWT_SECRET: '{{resolve:secretsmanager:kull/$STAGE/JWT_SECRET}}'"
echo "    SENDGRID_API_KEY: '{{resolve:secretsmanager:kull/$STAGE/SENDGRID_API_KEY}}'"
echo "    SUPER_ADMIN_EMAIL: '{{resolve:ssm:/kull/$STAGE/SUPER_ADMIN_EMAIL}}'"
echo ""
