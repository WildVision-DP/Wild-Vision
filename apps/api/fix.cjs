const fs = require('fs');
let code = fs.readFileSync('apps/api/src/routes/admin.ts', 'utf8');
code = code.replace(/detection_status/g, 'confirmation_status');
code = code.replace(/reviewed_by/g, 'confirmed_by');
code = code.replace(/reviewed_at/g, 'confirmed_at');
code = code.replace(/'manual_approved'::confirmation_status_enum/g, "'confirmed'");
code = code.replace(/'rejected'::confirmation_status_enum/g, "'rejected'");
code = code.replace(/'pending_review'::confirmation_status_enum/g, "'pending_confirmation'");
code = code.replace(/pending_review/g, 'pending_confirmation'); // fix default status filter
fs.writeFileSync('apps/api/src/routes/admin.ts', code);
