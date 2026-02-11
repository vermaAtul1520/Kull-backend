# AWS & SAM CLI Setup Guide

Complete step-by-step guide to configure AWS and SAM CLI for KULL Backend deployment.

---

## Step 1: Install AWS CLI

```bash
# Install via Homebrew (recommended for Mac)
brew install awscli

# Verify installation
aws --version
```

---

## Step 2: Create AWS IAM User

1. Go to [AWS IAM Console](https://console.aws.amazon.com/iam/)
2. Click **Users** → **Create user**
3. User name: `kull-deployer`
4. Click **Next**
5. Select **Attach policies directly**
6. Search and attach these policies:
   - `AdministratorAccess` (or for more restricted access, use specific policies below)
7. Click **Create user**
8. Click on the user → **Security credentials** tab
9. Click **Create access key**
10. Select **Command Line Interface (CLI)**
11. Click **Create access key**
12. **SAVE THESE KEYS** - you'll need them next:
    - Access Key ID: `AKIA...`
    - Secret Access Key: `...`

---

## Step 3: Configure AWS CLI

```bash
aws configure
```

Enter when prompted:
```
AWS Access Key ID: (paste your Access Key ID)
AWS Secret Access Key: (paste your Secret Access Key)
Default region name: ap-south-1
Default output format: json
```

Verify it works:
```bash
aws sts get-caller-identity
```

You should see your account info.

---

## Step 4: Install SAM CLI

```bash
# Install via Homebrew
brew install aws-sam-cli

# Verify installation
sam --version
```

---

## Step 5: Install Docker (Required for SAM)

```bash
# Install Docker Desktop for Mac
brew install --cask docker

# Start Docker Desktop
open -a Docker
```

Wait for Docker to start (you'll see the whale icon in menu bar).

---

## Step 6: Setup Secrets in AWS

Run the interactive script:
```bash
cd /Users/rishabhpal1509/Desktop/Kull-backend
./scripts/setup-aws-secrets.sh prod
```

Or manually:
```bash
# Generate JWT secret
JWT_SECRET=$(openssl rand -hex 32)
echo "Your JWT Secret: $JWT_SECRET"

# Create secrets
aws secretsmanager create-secret \
  --name kull/prod/JWT_SECRET \
  --secret-string "$JWT_SECRET" \
  --region ap-south-1

aws secretsmanager create-secret \
  --name kull/prod/SENDGRID_API_KEY \
  --secret-string "YOUR_SENDGRID_KEY" \
  --region ap-south-1

# Create parameter
aws ssm put-parameter \
  --name /kull/prod/SUPER_ADMIN_EMAIL \
  --value "admin@yourdomain.com" \
  --type String \
  --region ap-south-1
```

---

## Step 7: Build and Deploy

```bash
cd /Users/rishabhpal1509/Desktop/Kull-backend

# Build
npm run sam:build

# Deploy (first time will ask to confirm)
npm run sam:deploy:prod
```

---

## Step 8: Get Your API URL

After deployment:
```bash
aws cloudformation describe-stacks \
  --stack-name kull-backend-prod \
  --query "Stacks[0].Outputs[?OutputKey=='ApiEndpoint'].OutputValue" \
  --output text
```

---

## Quick Checklist

- [ ] AWS CLI installed: `aws --version`
- [ ] AWS CLI configured: `aws configure`
- [ ] SAM CLI installed: `sam --version`
- [ ] Docker running: `docker ps`
- [ ] Secrets created in AWS
- [ ] Run `npm run sam:build`
- [ ] Run `npm run sam:deploy:prod`
