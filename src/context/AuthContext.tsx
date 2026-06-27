/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthSession, User } from '../types';

interface AuthContextType {
  session: AuthSession | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateLastActivity: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const storedSession = localStorage.getItem('stay_safe_session');
    if (storedSession) {
      try {
        const parsedSession = JSON.parse(storedSession) as AuthSession;
        // Check if session is still valid (within 24 hours)
        const sessionAge = Date.now() - parsedSession.loginTime;
        const MAX_SESSION_AGE = 24 * 60 * 60 * 1000; // 24 hours

        if (sessionAge < MAX_SESSION_AGE) {
          setSession(parsedSession);
        } else {
          localStorage.removeItem('stay_safe_session');
        }
      } catch (e) {
        console.error('Failed to restore session:', e);
        localStorage.removeItem('stay_safe_session');
      }
    }
    setIsLoading(false);
  }, []);

  // Generate SHA-256 hash (simple implementation using SubtleCrypto)
  const hashPassword = async (password: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  // Verify password against stored hash
  const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
    const newHash = await hashPassword(password);
    return newHash === hash;
  };

  const register = async (email: string, password: string) => {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    // Check if user already exists
    const users = JSON.parse(localStorage.getItem('stay_safe_users') || '[]') as User[];
    if (users.some(u => u.email === email)) {
      throw new Error('User already exists');
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create new user
    const newUser: User = {
      id: `user_${Date.now()}`,
      email,
      passwordHash,
      createdAt: Date.now(),
    };

    users.push(newUser);
    localStorage.setItem('stay_safe_users', JSON.stringify(users));

    // Auto-login after registration
    await loginUser(newUser);
  };

  const loginUser = async (user: User) => {
    const sessionToken = `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newSession: AuthSession = {
      userId: user.id,
      email: user.email,
      sessionToken,
      loginTime: Date.now(),
      lastActivity: Date.now(),
    };

    setSession(newSession);
    localStorage.setItem('stay_safe_session', JSON.stringify(newSession));
  };

  const login = async (email: string, password: string) => {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    const users = JSON.parse(localStorage.getItem('stay_safe_users') || '[]') as User[];
    const user = users.find(u => u.email === email);

    if (!user) {
      throw new Error('Invalid email or password');
    }

    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    await loginUser(user);
  };

  const logout = () => {
    setSession(null);
    localStorage.removeItem('stay_safe_session');
  };

  const updateLastActivity = () => {
    if (session) {
      const updatedSession = {
        ...session,
        lastActivity: Date.now(),
      };
      setSession(updatedSession);
      localStorage.setItem('stay_safe_session', JSON.stringify(updatedSession));
    }
  };

  return (
    <AuthContext.Provider value={{ session, isLoading, isAuthenticated: !!session, login, register, logout, updateLastActivity }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
