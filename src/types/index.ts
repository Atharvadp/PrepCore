export interface User {
  id: string
  email: string
  username?: string
}

export interface Profile {
  id: string
  username: string
  current_streak: number
  longest_streak: number
  last_study_date: string | null
  created_at: string
}

export interface Task {
  id: string
  user_id: string
  title: string
  description: string
  subject: string
  is_completed: boolean
  created_at: string
}

export interface StudySession {
  id: string
  user_id: string
  task_id: string | null
  duration_minutes: number
  started_at: string
  ended_at: string | null
  completed: boolean
}

export interface QnA {
  id: string
  user_id: string
  question: string
  answer: string
  created_at: string
}
