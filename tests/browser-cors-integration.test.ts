import { test, describe } from 'node:test';
import * as assert from 'node:assert';

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:8080';
const FRONTEND_ORIGIN = 'http://localhost:3005';

describe('BROWSER CORS & AUTHENTICATION INTEGRATION TEST (localhost:3005 -> localhost:8080)', () => {
  let accessToken: string;
  let refreshTokenCookie: string;
  let accessTokenCookie: string;

  test('1. Preflight OPTIONS /api/auth/login returns exact origin and credentials: true', async () => {
    const res = await fetch(`${GATEWAY_URL}/api/auth/login`, {
      method: 'OPTIONS',
      headers: {
        Origin: FRONTEND_ORIGIN,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type,Authorization,x-workspace-id',
      },
    });

    assert.strictEqual(res.status, 204, 'Preflight status should be 204');
    const allowOrigin = res.headers.get('access-control-allow-origin');
    const allowCredentials = res.headers.get('access-control-allow-credentials');

    assert.strictEqual(
      allowOrigin,
      FRONTEND_ORIGIN,
      `Access-Control-Allow-Origin MUST match ${FRONTEND_ORIGIN} and MUST NOT be '*'`
    );
    assert.strictEqual(
      allowCredentials,
      'true',
      'Access-Control-Allow-Credentials MUST be "true"'
    );
  });

  test('2. Disallowed origin (e.g. http://malicious-attacker.com) is NOT permitted by CORS', async () => {
    const res = await fetch(`${GATEWAY_URL}/api/auth/login`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://malicious-attacker.com',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type',
      },
    });

    const allowOrigin = res.headers.get('access-control-allow-origin');
    assert.notStrictEqual(
      allowOrigin,
      'http://malicious-attacker.com',
      'Malicious origin must not receive Access-Control-Allow-Origin matching its origin'
    );
    assert.notStrictEqual(allowOrigin, '*', 'CORS must not allow wildcard on credentials mode');
  });

  test('3. POST /api/auth/login succeeds with credentials and sets HttpOnly cookies', async () => {
    const res = await fetch(`${GATEWAY_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        Origin: FRONTEND_ORIGIN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'owner@collab.local',
        password: 'Password123!',
      }),
    });

    assert.strictEqual(res.status, 200, 'Login status should be 200 OK');
    assert.strictEqual(res.headers.get('access-control-allow-origin'), FRONTEND_ORIGIN);
    assert.strictEqual(res.headers.get('access-control-allow-credentials'), 'true');

    // Extract cookies
    const setCookieHeaders = res.headers.getSetCookie();
    assert.ok(setCookieHeaders.length >= 2, 'Should set at least 2 cookies (access + refresh)');

    const refreshHeader = setCookieHeaders.find((c) => c.startsWith('collab_refresh_token='));
    const accessHeader = setCookieHeaders.find((c) => c.startsWith('collab_access_token='));

    assert.ok(refreshHeader, 'collab_refresh_token cookie must be present');
    assert.ok(accessHeader, 'collab_access_token cookie must be present');

    assert.ok(refreshHeader.includes('HttpOnly'), 'Refresh cookie must be HttpOnly');
    assert.ok(refreshHeader.includes('Path=/'), 'Refresh cookie must have Path=/');
    assert.ok(refreshHeader.includes('SameSite=Lax'), 'Refresh cookie must have SameSite=Lax');

    const body = (await res.json()) as any;
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.user.email, 'owner@collab.local');
    assert.strictEqual(body.data.user.name, 'Nguyễn Văn Nam');
    assert.ok(body.data.workspaces.length >= 1);

    accessToken = body.data.tokens.accessToken;
    refreshTokenCookie = refreshHeader.split(';')[0];
    accessTokenCookie = accessHeader.split(';')[0];
  });

  test('4. GET /api/auth/me returns authenticated identity with CORS credentials', async () => {
    const res = await fetch(`${GATEWAY_URL}/api/auth/me`, {
      method: 'GET',
      headers: {
        Origin: FRONTEND_ORIGIN,
        Authorization: `Bearer ${accessToken}`,
        Cookie: `${accessTokenCookie}; ${refreshTokenCookie}`,
      },
    });

    assert.strictEqual(res.status, 200, 'GET /me should return 200 OK');
    assert.strictEqual(res.headers.get('access-control-allow-origin'), FRONTEND_ORIGIN);
    assert.strictEqual(res.headers.get('access-control-allow-credentials'), 'true');

    const body = (await res.json()) as any;
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.user.email, 'owner@collab.local');
    assert.strictEqual(body.data.user.name, 'Nguyễn Văn Nam');
  });

  test('5. POST /api/auth/refresh rotates session using only HttpOnly cookie', async () => {
    const res = await fetch(`${GATEWAY_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        Origin: FRONTEND_ORIGIN,
        'Content-Type': 'application/json',
        Cookie: refreshTokenCookie,
      },
    });

    assert.strictEqual(res.status, 200, 'POST /refresh should return 200 OK');
    assert.strictEqual(res.headers.get('access-control-allow-origin'), FRONTEND_ORIGIN);
    assert.strictEqual(res.headers.get('access-control-allow-credentials'), 'true');

    const setCookies = res.headers.getSetCookie();
    const newRefreshHeader = setCookies.find((c) => c.startsWith('collab_refresh_token='));
    assert.ok(newRefreshHeader, 'New refresh token cookie must be returned');

    const body = (await res.json()) as any;
    assert.strictEqual(body.success, true);
    assert.ok(body.data.accessToken);

    accessToken = body.data.accessToken;
    refreshTokenCookie = newRefreshHeader.split(';')[0];
  });

  test('6. POST /api/auth/logout clears session cookies with Path=/', async () => {
    const res = await fetch(`${GATEWAY_URL}/api/auth/logout`, {
      method: 'POST',
      headers: {
        Origin: FRONTEND_ORIGIN,
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        Cookie: refreshTokenCookie,
      },
    });

    assert.strictEqual(res.status, 200, 'Logout status should be 200 OK');
    assert.strictEqual(res.headers.get('access-control-allow-origin'), FRONTEND_ORIGIN);

    const setCookies = res.headers.getSetCookie();
    const clearedRefresh = setCookies.find((c) => c.startsWith('collab_refresh_token=;'));
    assert.ok(clearedRefresh, 'collab_refresh_token cookie must be cleared');
    assert.ok(clearedRefresh.includes('Expires=Thu, 01 Jan 1970'), 'Cookie must be expired');
  });

  test('7. Subsequent GET /api/auth/me after logout without credentials is rejected with 401', async () => {
    // In real browser, cookies and localStorage are cleared upon logout
    const res = await fetch(`${GATEWAY_URL}/api/auth/me`, {
      method: 'GET',
      headers: {
        Origin: FRONTEND_ORIGIN,
      },
    });

    assert.strictEqual(res.status, 401, 'Request after logout without credentials must return 401 Unauthorized');
    const body = (await res.json()) as any;
    assert.strictEqual(body.success, false);
    assert.strictEqual(res.headers.get('access-control-allow-origin'), FRONTEND_ORIGIN);
    assert.strictEqual(res.headers.get('access-control-allow-credentials'), 'true');
  });

  test('8. Attempting to refresh using the revoked session cookie is rejected', async () => {
    const res = await fetch(`${GATEWAY_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        Origin: FRONTEND_ORIGIN,
        'Content-Type': 'application/json',
        Cookie: refreshTokenCookie,
      },
    });

    assert.strictEqual(res.status, 401, 'Revoked session cannot be refreshed');
    assert.strictEqual(res.headers.get('access-control-allow-origin'), FRONTEND_ORIGIN);
  });
});
