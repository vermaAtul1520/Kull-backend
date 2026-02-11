#!/bin/bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5NzlkZmZlNTg3NzY5YjA3ZmY4MmE5NSIsInJvbGUiOiJ1c2VyIiwiZW1haWwiOiJqaXRlbmRlci5hbXVsQGdtYWlsLmNvbSIsInBob25lIjoiOTMxMjkwNjgxNyIsImNvbW11bml0eSI6IjY5NTgwNzZkZTA2OWQ1MjYyODg3MjU2ZiIsInJvbGVJbkNvbW11bml0eSI6ImFkbWluIiwiaWF0IjoxNzcwNDk1OTQ5LCJleHAiOjE3NzExMDA3NDl9.DtGGy5gdNuBnke2kCuUAb0ja4r6pvWAzd2KVe3suHS8"
BASE_URL="https://3lkh5yv9zg.execute-api.ap-south-1.amazonaws.com/prod/api"
COMMUNITY_ID="6958076de069d5262887256f"
COMMUNITY_CODE="JK3MS9NA1"

ENDPOINTS=(
  "/auth/community-admin/dashboard-stats"
  "/users/pending"
  "/communities/$COMMUNITY_CODE/gotraDetail"
  "/posts/community/$COMMUNITY_ID"
  "/donations/community/$COMMUNITY_ID"
  "/news/community/$COMMUNITY_ID"
  "/appeals/community/$COMMUNITY_ID"
  "/dukaans/community/$COMMUNITY_ID"
  "/educationResources/community/$COMMUNITY_ID"
  "/jobPosts/community/$COMMUNITY_ID"
  "/kartavya/community/$COMMUNITY_ID"
  "/meetings/community/$COMMUNITY_ID"
  "/sportsEvents/community/$COMMUNITY_ID"
  "/occasions?community=$COMMUNITY_ID"
  "/occasion-categories?community=$COMMUNITY_ID"
  "/family/tree"
)

echo "Testing GET Endpoints (Revised)..."
for ep in "${ENDPOINTS[@]}"; do
  echo -n "Testing $ep: "
  status=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "$BASE_URL$ep")
  echo "$status"
  if [ "$status" -ne 200 ]; then
    echo "FAILED: $ep returned $status"
    # Optionally fetch the body for error info
    curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL$ep" | head -c 500
    echo -e "\n---"
  fi
done
