#!/bin/bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5NzlkZmZlNTg3NzY5YjA3ZmY4MmE5NSIsInJvbGUiOiJ1c2VyIiwiZW1haWwiOiJqaXRlbmRlci5hbXVsQGdtYWlsLmNvbSIsInBob25lIjoiOTMxMjkwNjgxNyIsImNvbW11bml0eSI6IjY5NTgwNzZkZTA2OWQ1MjYyODg3MjU2ZiIsInJvbGVJbkNvbW11bml0eSI6ImFkbWluIiwiaWF0IjoxNzcwNDk1OTQ5LCJleHAiOjE3NzExMDA3NDl9.DtGGy5gdNuBnke2kCuUAb0ja4r6pvWAzd2KVe3suHS8"
BASE_URL="https://3lkh5yv9zg.execute-api.ap-south-1.amazonaws.com/prod/api"
COMMUNITY_ID="6958076de069d5262887256f"

ENDPOINTS=(
  "/auth/community-admin/dashboard-stats"
  "/users/me"
  "/communities"
  "/communities/$COMMUNITY_ID/gotraDetail"
  "/posts"
  "/donations"
  "/news"
  "/appeals"
  "/dukaans"
  "/educationResources"
  "/jobPosts"
  "/kartavya"
  "/meetings"
  "/sportsEvents"
  "/occasions"
  "/occasion-categories"
  "/family"
)

echo "Testing GET Endpoints..."
for ep in "${ENDPOINTS[@]}"; do
  echo -n "Testing $ep: "
  status=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "$BASE_URL$ep")
  echo "$status"
  if [ "$status" -ne 200 ]; then
    echo "FAILED: $ep returned $status"
    # Optionally fetch the body for error info
    curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL$ep" | head -c 200
    echo -e "\n---"
  fi
done
