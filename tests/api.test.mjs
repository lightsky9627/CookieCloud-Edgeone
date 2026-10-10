import test from 'node:test';
import assert from 'node:assert/strict';
import { handleRequest } from '../dist-server/edgeone-entry.js';
import { cookieEncrypt, cookieDecrypt } from '../dist-server/utils/crypto.js';

test('1. Crypto: legacy algorithm encrypt & decrypt', () => {
  const uuid = 'user-test-uuid-1';
  const pass = 'secret123';
  const testData = { cookies: [{ name: 'session', value: 'xyz789' }] };

  const encrypted = cookieEncrypt(uuid, testData, pass, 'legacy');
  assert.ok(encrypted.length > 0);

  const decrypted = cookieDecrypt(uuid, encrypted, pass, 'legacy');
  assert.deepEqual(decrypted, testData);
});

test('2. Crypto: aes-128-cbc-fixed algorithm encrypt & decrypt', () => {
  const uuid = 'user-test-uuid-2';
  const pass = 'password456';
  const testData = { cookie_data: { 'example.com': [{ name: 'token', value: 'abc' }] } };

  const encrypted = cookieEncrypt(uuid, testData, pass, 'aes-128-cbc-fixed');
  assert.ok(encrypted.length > 0);

  const decrypted = cookieDecrypt(uuid, encrypted, pass, 'aes-128-cbc-fixed');
  assert.deepEqual(decrypted, testData);
});

test('3. API: GET /health', async () => {
  const env = { STORAGE_DRIVER: 'memory' };
  const req = new Request('http://localhost/health');
  const res = await handleRequest(req, env);

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.status, 'OK');
  assert.ok(typeof data.uptime === 'number');
});

test('4. API: POST /update and GET /get/:uuid (end-to-end encrypted)', async () => {
  const env = { STORAGE_DRIVER: 'memory' };
  const uuid = 'test-uuid-e2e';
  const encryptedPayload = 'U2FsdGVkX1+mockEncryptedString123';

  // 1. Update
  const updateReq = new Request('http://localhost/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      uuid,
      encrypted: encryptedPayload,
      crypto_type: 'aes-128-cbc-fixed',
    }),
  });
  const updateRes = await handleRequest(updateReq, env);
  assert.equal(updateRes.status, 200);
  const updateJson = await updateRes.json();
  assert.equal(updateJson.action, 'done');

  // 2. Get encrypted
  const getReq = new Request(`http://localhost/get/${uuid}`);
  const getRes = await handleRequest(getReq, env);
  assert.equal(getRes.status, 200);
  const getJson = await getRes.json();
  assert.equal(getJson.encrypted, encryptedPayload);
  assert.equal(getJson.crypto_type, 'aes-128-cbc-fixed');
});

test('5. API: POST /get/:uuid with password (server-side decryption - new feature)', async () => {
  const env = { STORAGE_DRIVER: 'memory' };
  const uuid = 'test-uuid-server-decrypt';
  const pass = 'my-sync-secret';
  const cookieData = {
    cookie_data: {
      'github.com': [{ name: 'user_session', value: 'secret_token_123' }],
    },
  };

  // Encrypt
  const encrypted = cookieEncrypt(uuid, cookieData, pass, 'aes-128-cbc-fixed');

  // Store
  await handleRequest(
    new Request('http://localhost/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uuid,
        encrypted,
        crypto_type: 'aes-128-cbc-fixed',
      }),
    }),
    env
  );

  // POST /get/:uuid with password
  const decryptReq = new Request(`http://localhost/get/${uuid}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: pass }),
  });
  const decryptRes = await handleRequest(decryptReq, env);
  assert.equal(decryptRes.status, 200);
  const decryptedJson = await decryptRes.json();
  assert.deepEqual(decryptedJson, cookieData);

  // POST /get/:uuid with WRONG password
  const wrongReq = new Request(`http://localhost/get/${uuid}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'wrong-password' }),
  });
  const wrongRes = await handleRequest(wrongReq, env);
  assert.equal(wrongRes.status, 400);
  const wrongJson = await wrongRes.json();
  assert.equal(wrongJson.action, 'error');
});
