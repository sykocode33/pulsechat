import { prisma } from '../../plugins/prisma.js';

// ─── Get User by ID ────────────────────────────────
export async function getUserById(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      username: true,
      avatar: true,
      bio: true,
      status: true,
      isOnline: true,
      lastSeen: true,
      role: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw { statusCode: 404, message: 'User not found' };
  }

  return user;
}

// ─── Update Profile ────────────────────────────────
export async function updateProfile(userId: string, data: { username?: string; bio?: string; status?: string; avatar?: string }) {
  // If updating username, check uniqueness
  if (data.username) {
    const existing = await prisma.user.findUnique({ where: { username: data.username } });
    if (existing && existing.id !== userId) {
      throw { statusCode: 409, message: 'Username already taken' };
    }
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      email: true,
      username: true,
      avatar: true,
      bio: true,
      status: true,
      isOnline: true,
      lastSeen: true,
      role: true,
      createdAt: true,
    },
  });

  return user;
}

// ─── Search Users ──────────────────────────────────
export async function searchUsers(query: string, currentUserId: string) {
  const users = await prisma.user.findMany({
    where: {
      AND: [
        { id: { not: currentUserId } },
        { isActive: true },
        {
          OR: [
            { username: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
          ],
        },
      ],
    },
    select: {
      id: true,
      username: true,
      avatar: true,
      bio: true,
      status: true,
      isOnline: true,
      lastSeen: true,
    },
    take: 20,
    orderBy: { username: 'asc' },
  });

  return users;
}

// ─── Get All Users (Admin) ─────────────────────────
export async function getAllUsers(page: number = 1, limit: number = 20) {
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      skip,
      take: limit,
      select: {
        id: true,
        email: true,
        username: true,
        avatar: true,
        bio: true,
        status: true,
        isOnline: true,
        lastSeen: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count(),
  ]);

  return { users, total, page, totalPages: Math.ceil(total / limit) };
}
