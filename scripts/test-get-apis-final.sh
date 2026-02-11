#!/bin/bash
# scripts/test-get-apis-final.sh

BASE_URL="https://3lkh5yv9zg.execute-api.ap-south-1.amazonaws.com/prod/api"

# Admin Credentials
EMAIL="jitender.amul@gmail.com"
PASSWORD="Muskan@01"
COMM_ID="6958076de069d5262887256f"
COMM_CODE="SHASH01"

echo "Logging in to get fresh token..."
LOGIN_RES=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"emailOrPhone\":\"$EMAIL\", \"password\":\"$PASSWORD\", \"communityId\":\"$COMM_ID\"}")

TOKEN=$(echo $LOGIN_RES | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "Login failed!"
  echo "Response: $LOGIN_RES"
  exit 1
fi

echo "Login successful!"
echo "--------------------------------------------------"

endpoints=(
  "/auth/community-admin/dashboard-stats"
  "/users/pending"
  "/communities/$COMM_CODE/gotraDetail"
  "/posts/community/$COMM_ID"
  "/donations/community/$COMM_ID"
  "/news/community/$COMM_ID"
  "/appeals?community=$COMM_ID"
  "/dukaans?community=$COMM_ID"
  "/educationResources?community=$COMM_ID"
  "/jobPosts?community=$COMM_ID"
  "/kartavya?community=$COMM_ID"
  "/meetings?community=$COMM_ID"
  "/sportsEvents?community=$COMM_ID"
  "/occasions?community=$COMM_ID"
  "/occasion-categories?community=$COMM_ID"
  "/family/tree"
)

for endpoint in "${endpoints[@]}"; do
  echo "Testing: $endpoint"
  # Don't add community param if already present in endpoint
  if [[ "$endpoint" == *"?"* ]]; then
    response=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $TOKEN" "$BASE_URL$endpoint")
  else
    response=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $TOKEN" "$BASE_URL$endpoint")
  fi
  
  status_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$status_code" -eq 200 ] || [ "$status_code" -eq 201 ]; then
    echo "SUCCESS: Status $status_code"
  else
    echo "FAILED: Status $status_code"
    echo "Response: $body"
  fi
  echo "--------------------------------------------------"
done
