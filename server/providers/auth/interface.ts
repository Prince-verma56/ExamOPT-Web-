/**
 * AuthProvider Interface
 *
 * Application code should import this interface, not a vendor SDK.
 * Vendor-specific adapters implement this interface.
 */

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role: string;
  emailVerified?: boolean;
}

export interface AuthSession {
  user: AuthUser;
  expires: Date;
}

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface CreateUserInput {
  email: string;
  password: string;
  name?: string;
  role?: string;
}

export interface AuthProvider {
  signIn(credentials: SignInCredentials): Promise<AuthSession>;
  signOut(): Promise<void>;
  getSession(): Promise<AuthSession | null>;
  createUser(input: CreateUserInput): Promise<AuthUser>;
  verifyIdentity?(token: string): Promise<boolean>;
}
