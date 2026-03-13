# Security Policy

## Supported Versions

The following versions of Truth Tutor are currently supported with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | ✅ Yes             |
| 0.4.x   | ⚠️ Security only   |
| < 0.4   | ❌ No              |

## Reporting a Vulnerability

If you discover a security vulnerability within Truth Tutor, please send an email to the project maintainers. All security vulnerabilities will be promptly addressed.

Please include the following information:

- Type of vulnerability
- Full paths of source file(s) related to the vulnerability
- Location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

## Security Best Practices

### API Keys

- Never commit API keys to version control
- Use environment variables or secure config files
- Rotate API keys regularly
- Use the principle of least privilege

### Local Development

- Use `.env` files (already gitignored) for local configuration
- Don't run with elevated privileges unless necessary
- Keep your Node.js installation up to date
- Review dependencies regularly

### Production Deployment

- Use HTTPS in production
- Keep dependencies up to date
- Monitor for unusual activity
- Implement proper access controls
- Regular security audits

## Known Security Considerations

### Input Validation

Truth Tutor validates user inputs but always treat AI model outputs as untrusted. The AI can generate unexpected responses.

### Data Storage

- Learning profiles and drill data are stored locally in `data/`
- Review and clean up data periodically
- Don't store sensitive information in user inputs

### API Calls

- All API calls are made over HTTPS
- API keys are never logged or exposed
- Timeout limits are enforced on API calls

## Security Updates

When a security vulnerability is reported:
1. We will confirm the vulnerability
2. We will develop a fix
3. We will release a security update
4. We will publish release notes

## Contact

For security issues, please contact the project maintainers directly rather than using public issue trackers.
