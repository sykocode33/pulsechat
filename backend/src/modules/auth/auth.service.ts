import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../../plugins/prisma.js';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import type { RegisterInput, LoginInput } from './auth.schema.js';

// ─── Types ─────────────────────────────────────────
interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface JwtPayload {
  userId: string;
  email: string;
  username: string;
  role: string;
}

// ─── Password Hashing ──────────────────────────────
const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ─── JWT Generation ────────────────────────────────
export function generateAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRY,
  });
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(40).toString('hex');
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
}

// ─── Token Pair Generation ─────────────────────────
async function generateTokenPair(user: { id: string; email: string; username: string; role: string }): Promise<TokenPair> {
  const payload: JwtPayload = {
    userId: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken();

  // Calculate expiry (7 days)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  // Store refresh token in DB
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt,
    },
  });

  return { accessToken, refreshToken };
}

// ─── Register ──────────────────────────────────────
export async function register(input: RegisterInput) {
  const { email, username, password } = input;

  // Check if email already exists
  const existingEmail = await prisma.user.findUnique({ where: { email } });
  if (existingEmail) {
    throw { statusCode: 409, message: 'Email already registered' };
  }

  // Check if username already exists
  const existingUsername = await prisma.user.findUnique({ where: { username } });
  if (existingUsername) {
    throw { statusCode: 409, message: 'Username already taken' };
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email,
      username,
      passwordHash,
    },
    select: {
      id: true,
      email: true,
      username: true,
      avatar: true,
      bio: true,
      status: true,
      role: true,
      createdAt: true,
    },
  });

  const tokens = await generateTokenPair(user);

  logger.info(`User registered: ${user.username} (${user.email})`);

  return { user, ...tokens };
}

// ─── Login ─────────────────────────────────────────
export async function login(input: LoginInput) {
  const { email, password } = input;

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      username: true,
      passwordHash: true,
      avatar: true,
      bio: true,
      status: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw { statusCode: 401, message: 'Invalid email or password' };
  }

  if (!user.isActive) {
    throw { statusCode: 403, message: 'Account is suspended' };
  }

  const isValidPassword = await verifyPassword(password, user.passwordHash);
  if (!isValidPassword) {
    throw { statusCode: 401, message: 'Invalid email or password' };
  }

  const tokens = await generateTokenPair(user);

  // Update last seen
  await prisma.user.update({
    where: { id: user.id },
    data: { lastSeen: new Date(), isOnline: true },
  });

  logger.info(`User logged in: ${user.username}`);

  const { passwordHash: _, ...userWithoutPassword } = user;
  return { user: userWithoutPassword, ...tokens };
}

// ─── Refresh Token ─────────────────────────────────
export async function refresh(refreshToken: string) {
  // Find the refresh token
  const storedToken = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
    include: { user: true },
  });

  if (!storedToken) {
    throw { statusCode: 401, message: 'Invalid refresh token' };
  }

  if (storedToken.isRevoked) {
    // Token reuse detected — revoke ALL tokens for this user (security measure)
    await prisma.refreshToken.updateMany({
      where: { userId: storedToken.userId },
      data: { isRevoked: true },
    });
    logger.warn(`Refresh token reuse detected for user: ${storedToken.userId}`);
    throw { statusCode: 401, message: 'Token reuse detected. All sessions invalidated.' };
  }

  if (new Date() > storedToken.expiresAt) {
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { isRevoked: true },
    });
    throw { statusCode: 401, message: 'Refresh token expired' };
  }

  // Rotate: revoke old token, generate new pair
  await prisma.refreshToken.update({
    where: { id: storedToken.id },
    data: { isRevoked: true },
  });

  const tokens = await generateTokenPair(storedToken.user);

  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
}

// ─── Logout ────────────────────────────────────────
export async function logout(refreshToken: string, userId: string) {
  // Revoke the specific refresh token
  await prisma.refreshToken.updateMany({
    where: { token: refreshToken, userId },
    data: { isRevoked: true },
  });

  // Set user offline
  await prisma.user.update({
    where: { id: userId },
    data: { isOnline: false, lastSeen: new Date() },
  });

  logger.info(`User logged out: ${userId}`);
}

// ─── Logout All Devices ────────────────────────────
export async function logoutAll(userId: string) {
  await prisma.refreshToken.updateMany({
    where: { userId },
    data: { isRevoked: true },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { isOnline: false, lastSeen: new Date() },
  });

  logger.info(`User logged out from all devices: ${userId}`);
}
