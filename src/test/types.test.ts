/**
 * Simple test to verify TypeScript compilation and basic types
 */

import { describe, it, expect } from 'vitest';
import type {
  GameState,
  Player,
  AuthState,
  User,
  AuthUser
} from '../types';

describe('Type Definitions', () => {
  it('should define Player type correctly', () => {
    const player: Player = {
      name: 'Test Player',
      woodcutting: {
        level: 1,
        experience: 0,
        totalActions: 0
      }
    };

    expect(player.name).toBe('Test Player');
    expect(player.woodcutting.level).toBe(1);
  });

  it('should define AuthState type correctly', () => {
    const authState: AuthState = {
      isAuthenticated: false,
      user: null,
      token: null,
      isLoading: false,
      error: null
    };

    expect(authState.isAuthenticated).toBe(false);
    expect(authState.user).toBeNull();
  });

  it('should define User type correctly', () => {
    const user: User = {
      id: 'test-id',
      name: 'Test User',
      email: 'test@example.com',
      avatar: 'https://example.com/avatar.jpg',
      createdAt: Date.now(),
      lastLogin: Date.now()
    };

    expect(user.id).toBe('test-id');
    expect(user.email).toBe('test@example.com');
  });

  it('should allow extending Player with auth properties', () => {
    const playerWithAuth: Player & { userId?: string; isAuthenticated?: boolean } = {
      name: 'Auth Player',
      woodcutting: {
        level: 5,
        experience: 1000,
        totalActions: 50
      },
      userId: 'user-123',
      isAuthenticated: true
    };

    expect(playerWithAuth.userId).toBe('user-123');
    expect(playerWithAuth.isAuthenticated).toBe(true);
  });

  it('should define GameState with optional auth properties', () => {
    const gameState: GameState = {
      player: {
        name: 'Game Player',
        woodcutting: {
          level: 3,
          experience: 500,
          totalActions: 25
        }
      },
      session: {
        startTime: Date.now(),
        playTime: 3600000,
        sessionsPlayed: 5
      },
      lastSave: Date.now(),
      version: '1.0.0'
    };

    expect(gameState.player.name).toBe('Game Player');
    expect(gameState.version).toBe('1.0.0');
  });
});