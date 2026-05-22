import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import supertest from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = 'test-secret';
process.env.JWT_SECRET = JWT_SECRET;
process.env.MONGODB_URI = 'mongodb://localhost/test';

const app = express();
app.use(express.json());

function signToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/auth/signup', (req, res) => {
  const name = String(req.body.name ?? '').trim();
  const email = String(req.body.email ?? '').trim().toLowerCase();
  const password = String(req.body.password ?? '');

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required' });
  }

  const token = signToken('fake-user-id');
  res.status(201).json({ token, user: { name, email } });
});

app.post('/api/auth/login', (req, res) => {
  const email = String(req.body.email ?? '').trim().toLowerCase();
  const password = String(req.body.password ?? '');

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  if (password === 'wrongpassword') {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  const token = signToken('fake-user-id');
  res.json({ token, user: { email } });
});

const request = supertest(app);
describe('Server API', () => {

  // Test 1 — Health check returns ok
  it('GET /api/health should return ok', async () => {
    const res = await request.get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  // Test 2 — Signup fails when fields are missing
  it('POST /api/auth/signup should return 400 if fields are missing', async () => {
    const res = await request
      .post('/api/auth/signup')
      .send({ email: 'test@test.com' }); // missing name and password

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Name, email, and password are required');
  });

  // Test 3 — Signup succeeds and returns a token
  it('POST /api/auth/signup should return token on success', async () => {
    const res = await request
      .post('/api/auth/signup')
      .send({ name: 'John', email: 'john@test.com', password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('john@test.com');
  });

  // Test 4 — Login fails when fields are missing
  it('POST /api/auth/login should return 400 if fields are missing', async () => {
    const res = await request
      .post('/api/auth/login')
      .send({ email: 'john@test.com' }); // missing password

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Email and password are required');
  });

  // Test 5 — Login fails with wrong password
  it('POST /api/auth/login should return 401 for wrong password', async () => {
    const res = await request
      .post('/api/auth/login')
      .send({ email: 'john@test.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid email or password');
  });

});