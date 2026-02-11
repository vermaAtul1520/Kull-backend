#!/bin/bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5NzlkZmZlNTg3NzY5YjA3ZmY4MmE5NSIsInJvbGUiOiJ1c2VyIiwiZW1haWwiOiJqaXRlbmRlci5hbXVsQGdtYWlsLmNvbSIsInBob25lIjoiOTMxMjkwNjgxNyIsImNvbW11bml0eSI6IjY5NTgwNzZkZTA2OWQ1MjYyODg3MjU2ZiIsInJvbGVJbkNvbW11bml0eSI6ImFkbWluIiwiaWF0IjoxNzcwNTM3MzM2LCJleHAiOjE3NzExNDIxMzZ9.wdcPnfvFLo1hQLEf-tTpoHnodx9I5Gqucb8tOAcXbmM"
URL="https://3lkh5yv9zg.execute-api.ap-south-1.amazonaws.com/prod/api/occasions?occasionType=Family%20Deities&category=697a4d8223ebd976049a9158&page=1&limit=20"

echo "Testing Problematic URL (Normalized Data)..."
RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" "$URL")
echo "$RESPONSE" | jq .
