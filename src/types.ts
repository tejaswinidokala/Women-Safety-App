/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Contact {
  id: string;
  name: string;
  phone: string;
  avatarColor: string;
}

export interface User {
  id: string;
  email: string;
  passwordHash: string; // SHA-256 hash (DO NOT store plain passwords)
  createdAt: number;
}

export interface AuthSession {
  userId: string;
  email: string;
  sessionToken: string;
  loginTime: number;
  lastActivity: number;
}

export interface LocationLog {
  id: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  address: string;
  accuracy: number;
  triggerType: 'button' | 'shake' | 'test';
}

export type ActiveTab = 'home' | 'contacts' | 'location';

export interface FakeCallConfig {
  callerName: string;
  delaySeconds: number;
  voiceMode: 'silent' | 'simulated-voice';
}
