# AWS SES Setup Guide

To use AWS SES as an alternative to SendGrid, follow these steps:

## 1. AWS SES Configuration

1.  **Verify Sender Identity**:
    - Log in to the [AWS SES Console](https://console.aws.amazon.com/ses/).
    - Go to **Identities** and click **Create identity**.
    - Choose **Email address** or **Domain**.
    - Verify the identity by following the instructions sent to your email or by adding DNS records.

2.  **Request Production Access** (Optional but recommended):
    - By default, SES accounts are in the "Sandbox" environment.
    - In Sandbox mode, you can only send emails to verified identities.
    - To send emails to anyone, you must request production access via the SES console.

3.  **IAM Permissions**:
    - Ensure your IAM user or Lambda role has the following permissions:
      ```json
      {
          "Version": "2012-10-17",
          "Statement": [
              {
                  "Effect": "Allow",
                  "Action": [
                      "ses:SendEmail",
                      "ses:SendRawEmail"
                  ],
                  "Resource": "*"
              }
          ]
      }
      ```

## 2. Environment Variables

Update your `.env` or `env.json` (for SAM) with the following variables:

```env
# Enable AWS SES
USE_AWS_SES=true

# AWS Region (default is us-east-1)
AWS_REGION=us-east-1

# Verified Sender Email
SES_FROM_EMAIL=kullofficial01@gmail.com

# Disable SendGrid if you want to use SES as primary
USE_SENDGRID=false
```

## 3. Order of Precedence

The `emailService.js` follows this priority:
1.  **AWS SES** (if `USE_AWS_SES=true`)
2.  **SendGrid** (if `USE_SENDGRID=true` or `SENDGRID_API_KEY` is present)
3.  **Nodemailer/Gmail** (as fallback)
