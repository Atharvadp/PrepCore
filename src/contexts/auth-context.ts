import { createContext } from 'react'
import type { AuthUser } from './authTypes'

export interface AuthError {
  message: string
}

export interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<{ error: AuthError | null }>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
