#!/bin/bash

# Configuration
API_BASE_URL="https://3lkh5yv9zg.execute-api.ap-south-1.amazonaws.com/prod/api"
ADMIN_EMAIL="jitender.amul@gmail.com"
ADMIN_PASSWORD="your-password" # Will use the one from context if I could, but I'll use the one I know: Muskan@01
ADMIN_PASSWORD_ACTUAL="Muskan@01"

# Login
echo "Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"emailOrPhone\":\"$ADMIN_EMAIL\", \"password\":\"$ADMIN_PASSWORD_ACTUAL\"}")

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "Login failed!"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi
echo "Login successful!"

# Test 1: GetAll Occasions (No Filters)
echo "--------------------------------------------------"
echo "Test 1: /occasions (No Query)"
curl -s -X GET "${API_BASE_URL}/occasions?limit=1" \
  -H "Authorization: Bearer $TOKEN" | head -n 20
echo ""

# Test 2: Filter by occasionType
echo "--------------------------------------------------"
echo "Test 2: /occasions?occasionType=Family%20Deities"
curl -s -v -X GET "${API_BASE_URL}/occasions?occasionType=Family%20Deities&page=1&limit=20" \
  -H "Authorization: Bearer $TOKEN"
echo ""

# Test 3: Filter by category (if possible, just dummy check)
# echo "--------------------------------------------------"
# echo "Test 3: /occasions?category=..."
