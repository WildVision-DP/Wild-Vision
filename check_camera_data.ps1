$res = Invoke-RestMethod -Uri 'http://localhost:4000/auth/login' -Method POST -ContentType 'application/json' -Body '{"email":"admin@wildvision.gov.in","password":"Admin@123"}';
$token = $res.accessToken;
$cameras = Invoke-RestMethod -Uri 'http://localhost:4000/cameras' -Headers @{Authorization="Bearer $token"};
$cameras.cameras | Select-Object -First 2 | ConvertTo-Json -Depth 2
