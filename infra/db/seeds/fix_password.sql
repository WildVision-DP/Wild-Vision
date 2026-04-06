UPDATE users SET password_hash = '$2b$10$/MR6TmQvlWny.EXDM.0U0eNnKtXJS.BIofE8BjDRZ5s3ITiPfsUVi'
WHERE email = 'admin@example.com';
SELECT email, password_hash FROM users WHERE email = 'admin@example.com';
