DB_TYPE=dynamodb DYNAMODB_TABLE_PREFIX=kull-prod- node index.js > server.log 2>&1 &
PID=$!
sleep 4
echo "Testing Bhajan"
curl -s -i "http://localhost:5000/api/communities/123/bhajans"
echo -e "\n\nTesting Orgofficers"
curl -s -i "http://localhost:5000/api/communities/123/users/orgofficers"
kill $PID
git checkout middleware/isAuthenticated.js
