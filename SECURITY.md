# Security Documentation

## Overview

This application implements enterprise-grade security measures to protect against unauthorized access, bot attacks, DDoS, and other threats.

## Security Features

### 1. Enhanced Rate Limiting with Exponential Backoff

**Location**: `lib/rate-limit.js`

- **Initial Attempts**: 3 failed login attempts allowed
- **Lockout Schedule**:
  - 1st lockout: 1 minute
  - 2nd lockout: 2 minutes
  - 3rd lockout: 4 minutes
  - 4th lockout: 8 minutes
  - 5th lockout: 16 minutes
  - 6th lockout: 32 minutes
  - 7th+ lockout: 60 minutes (max)
- **Permanent Block**: After 10 lockouts, IP is permanently blocked
- **Automatic Cleanup**: Old entries cleaned up every 2 hours

### 2. Authentication & Authorization

**Location**: `lib/auth.js`, `app/api/auth/*`

- **Session-based auth**: Using `iron-session` with encrypted cookies
- **HttpOnly cookies**: Cannot be accessed via JavaScript (XSS protection)
- **Secure flag**: Cookies only sent over HTTPS in production
- **SameSite=Strict**: Prevents CSRF attacks
- **7-day session expiry**
- **Constant-time password comparison**: Prevents timing attacks
- **IP tracking**: Session stores client IP for additional verification

### 3. Protected API Endpoints

**All API routes except `/api/auth/login` require authentication:**

- `/api/auth/logout` - POST only, requires session
- `/api/auth/me` - GET only, returns auth status
- `/api/targets` - GET/POST, requires auth
- `/api/targets/[id]` - GET/PATCH/DELETE, requires auth
- `/api/schedule` - GET, requires auth
- `/api/run/manual` - POST, requires auth
- `/api/run/cron` - GET/POST, requires CRON_SECRET
- `/api/history` - GET, requires auth with pagination
- `/api/generate/keepalive-targets` - POST, requires auth

### 4. Credentials Encryption

**Location**: `lib/encryption.js`

- **Algorithm**: AES-256-GCM (authenticated encryption)
- **Key derivation**: PBKDF2 with 100,000 iterations
- **Random salt**: 16 bytes per encryption
- **Random IV**: 12 bytes per encryption
- **All credentials stored encrypted in database**

### 5. HMAC Signature Verification

**Location**: `lib/generator.js`

- **Algorithm**: HMAC-SHA256
- **Used for**: Signing KEEPALIVE_TARGETS configuration
- **Prevents**: Tampering with configuration data
- **Each target signed individually**

### 6. Global Rate Limiting (Middleware)

**Location**: `middleware.js`

- **Limit**: 100 requests per minute per IP per path
- **Window**: 60 seconds rolling window
- **Applies to**: All routes (entire application)
- **Headers**:
  - `X-RateLimit-Limit`: Max requests allowed
  - `X-RateLimit-Remaining`: Remaining requests in window
  - `Retry-After`: Seconds to wait (when rate limited)

### 7. Suspicious Pattern Blocking

**Location**: `middleware.js`

**Automatically blocks requests matching:**
- `/.env` - Environment file access attempts
- `/.git` - Git repository access attempts
- `/wp-admin` - WordPress admin probes
- `/phpmyadmin` - PHPMyAdmin probes
- `*.php` - PHP file execution attempts
- `/admin` - Generic admin paths
- `/administrator` - Alternative admin paths
- `/config` - Config file access attempts
- `/backup` - Backup file access attempts
- `*.sql`, `*.bak` - Database/backup file access

### 8. Security Headers

**Location**: `next.config.js`

```
X-Frame-Options: DENY
  - Prevents clickjacking attacks

X-Content-Type-Options: nosniff
  - Prevents MIME type sniffing

X-XSS-Protection: 1; mode=block
  - Enables XSS filter in older browsers

Referrer-Policy: strict-origin-when-cross-origin
  - Prevents URL leakage

Permissions-Policy: camera=(), microphone=(), geolocation=()
  - Disables unnecessary browser features

Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  - Enforces HTTPS (1 year)

Content-Security-Policy:
  - default-src 'self' - Only load resources from same origin
  - frame-ancestors 'none' - Cannot be embedded in iframes
  - form-action 'self' - Forms can only submit to same origin
```

### 9. Database Security

**Location**: `prisma/schema.prisma`, `lib/prisma.js`

- **Parameterized queries**: Prisma ORM prevents SQL injection
- **Edge-compatible**: Uses HTTP connection (Neon adapter)
- **Connection pooling**: Efficient resource usage
- **Credentials encrypted**: All sensitive data encrypted at rest

### 10. Logging & Monitoring

**Security events logged:**
- Failed login attempts (with IP)
- Successful logins (with IP)
- Rate limit violations
- Blocked IP access attempts
- Suspicious pattern matches
- Configuration errors

## Attack Mitigation

### Bot Protection
- ✅ Rate limiting (100 req/min global, 3 attempts for login)
- ✅ Exponential backoff (prevents brute force)
- ✅ IP-based blocking
- ✅ Suspicious pattern detection
- ✅ No public endpoints (all require auth)

### DDoS Protection
- ✅ Global rate limiting (100 req/min per IP)
- ✅ Vercel Edge Network (built-in DDoS protection)
- ✅ Connection pooling
- ✅ Lightweight responses

### Credential Stuffing
- ✅ Rate limiting with exponential backoff
- ✅ Permanent IP blocking after 10 lockouts
- ✅ Constant-time password comparison
- ✅ Lockout notifications with timing

### Man-in-the-Middle (MITM)
- ✅ HTTPS enforcement (HSTS header)
- ✅ Secure cookies
- ✅ Certificate pinning (via HSTS preload)

### Cross-Site Scripting (XSS)
- ✅ Content Security Policy
- ✅ HttpOnly cookies
- ✅ X-XSS-Protection header
- ✅ React auto-escaping

### Cross-Site Request Forgery (CSRF)
- ✅ SameSite=Strict cookies
- ✅ Same-origin policy (CSP)
- ✅ Session validation

### SQL Injection
- ✅ Prisma ORM (parameterized queries)
- ✅ No raw SQL
- ✅ Input validation

### Timing Attacks
- ✅ Constant-time password comparison
- ✅ Consistent error messages
- ✅ No information leakage

## Environment Security

### Required Secrets

**CRITICAL - Must be strong random values:**
```bash
ADMIN_PASSWORD="minimum-20-characters-highly-random"
SESSION_SECRET="minimum-32-characters-random-string"
KEEPALIVE_SECRET="minimum-32-characters-random-string"
CRON_SECRET="minimum-32-characters-random-string"
DATABASE_URL="postgresql://..."
```

### Generation Commands

```bash
# Generate secure random secrets
openssl rand -base64 32  # For SESSION_SECRET
openssl rand -base64 32  # For KEEPALIVE_SECRET
openssl rand -base64 32  # For CRON_SECRET
openssl rand -base64 32  # For ADMIN_PASSWORD (or use password manager)
```

## Security Checklist for Deployment

- [ ] All environment variables set with strong values
- [ ] `ADMIN_PASSWORD` is at least 20 characters
- [ ] All `*_SECRET` variables are 32+ random characters
- [ ] `DATABASE_URL` uses SSL (`?sslmode=require`)
- [ ] Vercel environment variables are encrypted
- [ ] HTTPS is enforced (automatic on Vercel)
- [ ] Test login rate limiting in staging
- [ ] Monitor blocked IPs in logs
- [ ] Set up alerts for repeated attacks
- [ ] Review security headers with securityheaders.com
- [ ] Run OWASP ZAP or similar security scanner
- [ ] Enable Vercel log drains for security monitoring

## Emergency Procedures

### Unblock an IP

If a legitimate IP is blocked, you can unblock it via Vercel CLI:

```bash
# SSH into production or use Vercel CLI
# This requires direct server access
vercel env pull
# Then manually clear the blocklist or wait for 2-hour cleanup
```

### Reset All Rate Limits

Rate limits are in-memory and will reset on:
- Server restart
- Vercel deployment
- 2-hour automatic cleanup

### Revoke All Sessions

Change `SESSION_SECRET` in environment variables to invalidate all sessions.

## Compliance

This implementation addresses:
- OWASP Top 10 vulnerabilities
- CWE Top 25 most dangerous software weaknesses
- NIST Cybersecurity Framework controls
- PCI DSS password security requirements (if applicable)

## Regular Security Maintenance

**Monthly:**
- Review blocked IP list
- Check for dependency vulnerabilities: `pnpm audit`
- Review login attempt logs
- Test rate limiting behavior

**Quarterly:**
- Rotate `ADMIN_PASSWORD`
- Rotate all secrets
- Security penetration test
- Review and update CSP policies

**Annually:**
- Full security audit
- Update all dependencies
- Review and update security policies

## Reporting Security Issues

If you discover a security vulnerability:
1. DO NOT open a public issue
2. Email security details to admin (keep private)
3. Include steps to reproduce
4. Allow 90 days for patching before disclosure
