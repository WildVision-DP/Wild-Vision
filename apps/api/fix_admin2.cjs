const fs = require('fs');
let code = fs.readFileSync('apps/api/src/routes/admin.ts', 'utf8');
code = code.replace(/confidence_max = '0\.9'/g, "confidence_max = '90'");
code = code.replace(/parseFloat\(confidence_max\) \|\| 1/g, "parseFloat(confidence_max) || 100");
code = code.replace(/parseFloat\(confidence_max\) \|\| 0\.9/g, "parseFloat(confidence_max) || 90");
fs.writeFileSync('apps/api/src/routes/admin.ts', code);
