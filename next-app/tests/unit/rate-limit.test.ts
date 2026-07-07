import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { checkRateLimit, getClientKey } from '@/lib/rate-limit';

function makeRequest(ip: string) {
  return new NextRequest('http://localhost/api/v1/test', {
    headers: { 'x-forwarded-for': ip },
  });
}

describe('getClientKey', () => {
  it('extracts the first IP from x-forwarded-for', () => {
    const req = makeRequest('1.2.3.4, 5.6.7.8');
    expect(getClientKey(req)).toBe('1.2.3.4');
  });

  it('falls back to x-real-ip when x-forwarded-for is absent', () => {
    const req = new NextRequest('http://localhost/api/v1/test', {
      headers: { 'x-real-ip': '9.9.9.9' },
    });
    expect(getClientKey(req)).toBe('9.9.9.9');
  });

  it('falls back to "unknown" when no IP headers are present', () => {
    const req = new NextRequest('http://localhost/api/v1/test');
    expect(getClientKey(req)).toBe('unknown');
  });
});

describe('checkRateLimit (in-memory fallback, no Upstash env configured)', () => {
  it('allows requests under the limit', async () => {
    const req = makeRequest('10.0.0.1');
    const result = await checkRateLimit(req, { name: 'test-bucket-a', limit: 3, windowSeconds: 60 });
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it('blocks requests once the limit is exceeded', async () => {
    const ip = '10.0.0.2';
    const opts = { name: 'test-bucket-b', limit: 2, windowSeconds: 60 };
    const r1 = await checkRateLimit(makeRequest(ip), opts);
    const r2 = await checkRateLimit(makeRequest(ip), opts);
    const r3 = await checkRateLimit(makeRequest(ip), opts);
    expect(r1.success).toBe(true);
    expect(r2.success).toBe(true);
    expect(r3.success).toBe(false);
    expect(r3.remaining).toBe(0);
  });

  it('scopes limits independently per client IP', async () => {
    const opts = { name: 'test-bucket-c', limit: 1, windowSeconds: 60 };
    const rA = await checkRateLimit(makeRequest('10.0.0.10'), opts);
    const rB = await checkRateLimit(makeRequest('10.0.0.11'), opts);
    expect(rA.success).toBe(true);
    expect(rB.success).toBe(true);
  });

  it('scopes limits independently per bucket name', async () => {
    const ip = '10.0.0.20';
    const r1 = await checkRateLimit(makeRequest(ip), { name: 'test-bucket-d1', limit: 1, windowSeconds: 60 });
    const r2 = await checkRateLimit(makeRequest(ip), { name: 'test-bucket-d2', limit: 1, windowSeconds: 60 });
    expect(r1.success).toBe(true);
    expect(r2.success).toBe(true);
  });
});
