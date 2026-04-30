const fs = require('fs');
const crypto = require('crypto');

const privateKey = `-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQgltnLGGRnxrHgkYl7
lE9zZBz4WR6zVtTYDB3LtDG8Yk+gCgYIKoZIzj0DAQehRANCAATM8lAo73miRKn0
jS2zxQw+Xi4BwAYd4gdF40yN8DuOf+kywtJoU+CGlJat/xnpgQg/WgnVAIdyKvfk
YZEqqmuO
-----END PRIVATE KEY-----`;

const teamId = 'CM6RTC63BW';
const keyId = 'CGQS8QY396';
const clientId = 'com.maisvaquejada.app.login';

const header = {
  alg: 'ES256',
  kid: keyId,
  typ: 'JWT'
};

const now = Math.floor(Date.now() / 1000);
const payload = {
  iss: teamId,
  iat: now,
  exp: now + 86400 * 180, // 6 months
  aud: 'https://appleid.apple.com',
  sub: clientId,
};

function base64url(obj) {
  return Buffer.from(JSON.stringify(obj))
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

const headAndPayload = base64url(header) + '.' + base64url(payload);

const sign = crypto.createSign('RSA-SHA256'); // Apple uses ES256, so we need ECDSA
