# Test Auth Endpoints

# Test 1: Register a new user
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@wildvision.gov.in",
    "password": "Admin@123",
    "fullName": "System Administrator",
    "roleId": "ROLE_ID_HERE"
  }'

# Test 2: Login
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@wildvision.gov.in",
    "password": "Admin@123"
  }'

# Test 3: Get current user (replace TOKEN with access token from login)
curl http://localhost:4000/auth/me \
  -H "Authorization: Bearer TOKEN"

# Test 4: Refresh token (replace REFRESH_TOKEN)
curl -X POST http://localhost:4000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "REFRESH_TOKEN"
  }'

# Test 5: Logout (replace TOKEN)
curl -X POST http://localhost:4000/auth/logout \
  -H "Authorization: Bearer TOKEN"
