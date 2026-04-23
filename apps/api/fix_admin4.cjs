const fs = require('fs');
let code = fs.readFileSync('apps/api/src/routes/admin.ts', 'utf8');
code = code.replace(/return c\.json\(\{ error: 'Failed to approve review' \}, 500\);/g, "return c.json({ error: 'Failed to approve review', details: error.message }, 500);");
fs.writeFileSync('apps/api/src/routes/admin.ts', code);
