import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { calculateStreak, getTodayDate } from '../utils/streakCalculator'
import SessionSetup from '../components/session/SessionSetup'
import SessionTimer from '../components/session/SessionTimer'
import SessionSummary from '../components/session/SessionSummary'

type SessionState = 'setup' | 'active' | 'summary'

export default function FocusSession() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [sessionState, setSessionState] = useState<SessionState>('setup')
  const [duration, setDuration] = useState(25)
  const [taskId, setTaskId] = useState<string | null>(null)
  const [taskTitle, setTaskTitle] = useState<string | undefined>(undefined)
  const [sessionId, setSessionId] = useState<string | null>(null)

  const handleStartSession = async (selectedDuration: number, selectedTaskId: string | null) => {
    setDuration(selectedDuration)
    setTaskId(selectedTaskId)

    // Fetch task title if task is selected
    if (selectedTaskId) {
      const { data } = await supabase
        .from('tasks')
        .select('title')
        .eq('id', selectedTaskId)
        .single()
      setTaskTitle(data?.title)
    }

    // Create session in database
    const { data, error } = await supabase
      .from('study_sessions')
      .insert([
        {
          user_id: user?.id,
          task_id: selectedTaskId,
          duration_minutes: selectedDuration,
          started_at: new Date().toISOString(),
          completed: false,
        },
      ])
      .select()
      .single()

    if (!error && data) {
      setSessionId(data.id)
      setSessionState('active')
    }
  }

  const handleCompleteSession = async () => {
    // Update session as completed
    if (sessionId) {
      await supabase
        .from('study_sessions')
        .update({
          ended_at: new Date().toISOString(),
          completed: true,
        })
        .eq('id', sessionId)
    }

    // Update streak
    try {
      // Get current profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('current_streak, longest_streak, last_study_date')
        .eq('id', user?.id)
        .single()

      if (profile) {
        const { newStreak, shouldReset } = calculateStreak(
          profile.last_study_date,
          profile.current_streak
        )

        const updatedLongestStreak = Math.max(newStreak, profile.longest_streak || 0)

        // Update profile with new streak
        await supabase
          .from('profiles')
          .update({
            current_streak: newStreak,
            longest_streak: updatedLongestStreak,
            last_study_date: getTodayDate(),
          })
          .eq('id', user?.id)
      }
    } catch (error) {
      console.error('Error updating streak:', error)
    }

    setSessionState('summary')
  }

  const handleCancelSession = async () => {
    if (sessionId) {
      await supabase.from('study_sessions').delete().eq('id', sessionId)
    }
    navigate('/dashboard')
  }

  const handleCloseSummary = () => {
    navigate('/dashboard')
  }

  return (
    <>
      {sessionState === 'setup' && <SessionSetup onStartSession={handleStartSession} />}
      {sessionState === 'active' && (
        <SessionTimer
          duration={duration}
          taskTitle={taskTitle}
          onComplete={handleCompleteSession}
          onCancel={handleCancelSession}
        />
      )}
      {sessionState === 'summary' && (
        <SessionSummary
          duration={duration}
          taskTitle={taskTitle}
          onClose={handleCloseSummary}
        />
      )}
    </>
  )
}
