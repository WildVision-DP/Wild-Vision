const fs = require('fs');
let code = fs.readFileSync('apps/api/src/routes/admin.ts', 'utf8');
code = code.replace(/const userId = user\.userId;/g, 'const userId = user.id || user.userId;');
fs.writeFileSync('apps/api/src/routes/admin.ts', code);
