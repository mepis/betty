/**
 * User routes: register, login, get current user.
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { Request, Response } from 'express-serve-static-core';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { db } from '../db/client.js';
import { generateToken } from '../middleware/auth.js';
import type { UserDTO, RegisterRequest, LoginRequest } from '../../shared/types.js';

const router = Router();

/** POST /api/users/register — create a new account (public) */
router.post('/register', async (req, res) => {
  try {
    const body: RegisterRequest = req.body;
    if (!body.username || !body.displayName || !body.password) {
      return res.status(400).json({ error: 'username, displayName, and password are required' });
    }

    // Check uniqueness
    const existingResult = await db.getUserByUsername(body.username) as { id: string; username: string; passwordHash: string } | null;
    if (existingResult) {
      return res.status(409).json({ error: `User '${body.username}' already exists` });
    }

    const id = randomUUID();
    const passwordHash = await bcrypt.hash(body.password, 12);

    await db.createUser({ id, username: body.username, displayName: body.displayName, passwordHash });

    // Generate token and return user info (without password hash)
    const token = generateToken(id);
    const userDTO = { id, username: body.username, displayName: body.displayName } as UserDTO;

    return res.status(201).json({ user: userDTO, token });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Registration failed';
    if (message.includes('already exists')) {
      return res.status(409).json({ error: message });
    }
    return res.status(500).json({ error: message });
  }
});

/** POST /api/users/login — authenticate and get JWT (public) */
router.post('/login', async (req, res) => {
  try {
    const body: LoginRequest = req.body;
    if (!body.username || !body.password) {
      return res.status(400).json({ error: 'username and password are required' });
    }

    // Look up user by username
    const userResult = await db.getUserByUsername(body.username) as { id: string; username: string; displayName: string; passwordHash: string } | null;
    if (!userResult) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = userResult;

    const validPassword = await bcrypt.compare(body.password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user.id);
    const userDTO = { id: user.id, username: user.username, displayName: user.displayName } as UserDTO;

    return res.json({ user: userDTO, token });
  } catch {
    return res.status(500).json({ error: 'Login failed' });
  }
});

/** GET /api/me — get current authenticated user */
router.get('/me', async (req: any, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userResult = await db.getUserById(userId) as { id: string; username: string; displayName: string } | null;
    if (!userResult) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult;
    const userDTO = { id: user.id, username: user.username, displayName: user.displayName } as UserDTO;

    return res.json({ user: userDTO });
  } catch {
    return res.status(500).json({ error: 'Failed to fetch user' });
  }
});

export default router;
