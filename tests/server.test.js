/** @jest-environment node */
const request = require('supertest');
const app = require('../server/index');

describe('Server security endpoints', () => {
  it('returns a CSRF token', async () => {
    const res = await request(app).get('/api/csrf-token');
    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
    const [nonce, expiry, signature] = res.body.token.split(':');
    expect(nonce).toMatch(/^[0-9a-f]+$/i);
    expect(Number(expiry)).toBeGreaterThan(Date.now());
    expect(signature).toMatch(/^[0-9a-f]{64}$/i);
  });

  it('rejects missing CSRF token on protected endpoint', async () => {
    const res = await request(app).post('/api/ekyc/error-report').send({});
    expect(res.status).toBe(403);
  });

  it('exposes a health check', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
