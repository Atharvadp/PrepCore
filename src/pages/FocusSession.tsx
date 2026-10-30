import { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { apiRequest, getApiErrorMessage } from '../lib/api'
import type { Task } from '../types'
import { createStudySessionPayload } from '../utils/sessionDuration'
import SessionSetup from '../components/session/SessionSetup'
import SessionTimer from '../components/session/SessionTimer'
import SessionSummary from '../components/session/SessionSummary'

type SessionState = 'setup' | 'active' | 'summary'

interface CreatedStudySession {
  id: string
}

function getBrowserTimeZone(): string | undefined {
  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
    return timeZone.trim() || undefined
  } catch {
    return undefined
  }
}

export default function FocusSession() {
  const navigate = useNavigate()
  const [sessionState, setSessionState] = useState<SessionState>('setup')
  const [duration, setDuration] = useState(15)
  const [taskTitle, setTaskTitle] = useState<string | undefined>(undefined)
  const [taskError, setTaskError] = useState('')
  const [completionError, setCompletionError] = useState('')
  const [cancelError, setCancelError] = useState('')
  const sessionIdRef = useRef<string | null>(null)
  const startInFlightRef = useRef(false)
  const completionInFlightRef = useRef(false)
  const completedRef = useRef(false)
  const cancellationInFlightRef = useRef(false)

  const handleStartSession = async (selectedDuration: number, selectedTaskId: string | null) => {
    if (startInFlightRef.current) {
      return
    }
    startInFlightRef.current = true
    setTaskError('')
    setCompletionError('')
    setCancelError('')
    setDuration(selectedDuration)
    setTaskTitle(undefined)

    try {
      // Fetch task title if task is selected
      if (selectedTaskId) {
        const { task } = await apiRequest<{ task: Task }>(
          `/tasks/${encodeURIComponent(selectedTaskId)}`,
        )
        setTaskTitle(task.title)
      }

      const timeZone = getBrowserTimeZone()
      const { session } = await apiRequest<{ session: CreatedStudySession }>(
        '/study-sessions',
        {
          method: 'POST',
          body: JSON.stringify(
            createStudySessionPayload(selectedDuration, selectedTaskId, timeZone),
          ),
        },
      )
      if (!session || typeof session.id !== 'string' || session.id.length === 0) {
        throw new Error('The server returned an invalid session response.')
      }

      sessionIdRef.current = session.id
      setSessionState('active')
    } catch (error: unknown) {
      setTaskError(
        getApiErrorMessage(
          error,
          error instanceof Error ? error.message : 'Unable to start the session. Please try again.',
        ),
      )
    } finally {
      startInFlightRef.current = false
    }
  }

  const handleCompleteSession = useCallback(async () => {
    const activeSessionId = sessionIdRef.current
    if (!activeSessionId || completedRef.current || completionInFlightRef.current) {
      return
    }

    completionInFlightRef.current = true
    setCompletionError('')
    try {
      await apiRequest<{ session: CreatedStudySession }>(
        `/study-sessions/${encodeURIComponent(activeSessionId)}/complete`,
        { method: 'PATCH' },
      )
      completedRef.current = true
      setSessionState('summary')
    } catch (error: unknown) {
      setCompletionError(
        getApiErrorMessage(error, 'Unable to save session completion. Please retry.'),
      )
    } finally {
      completionInFlightRef.current = false
    }
  }, [])

  const handleCancelSession = useCallback(async () => {
    const activeSessionId = sessionIdRef.current
    if (cancellationInFlightRef.current) {
      return
    }

    cancellationInFlightRef.current = true
    setCancelError('')
    try {
      if (activeSessionId) {
        await apiRequest<{ message: string }>(
          `/study-sessions/${encodeURIComponent(activeSessionId)}`,
          { method: 'DELETE' },
        )
      }
      sessionIdRef.current = null
      navigate('/dashboard')
    } catch (error: unknown) {
      setCancelError(
        getApiErrorMessage(error, 'Unable to cancel the session. Please retry.'),
      )
    } finally {
      cancellationInFlightRef.current = false
    }
  }, [navigate])

  const handleCloseSummary = () => {
    navigate('/dashboard')
  }

  const handleBackClick = () => {
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-calm via-blue-50 to-indigo-50 relative">
      {/* Back button - only show during setup */}
      {sessionState === 'setup' && (
        <button
          onClick={handleBackClick}
          className="absolute top-6 left-6 p-2 bg-white/80 hover:bg-white rounded-lg transition-all shadow-sm z-10 flex items-center gap-2 text-gray-700 hover:text-gray-900"
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back</span>
        </button>
      )}

      {taskError && (
        <div className="absolute top-20 left-1/2 z-20 w-[min(90%,32rem)] -translate-x-1/2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700" role="alert">
          {taskError}
        </div>
      )}
      {completionError && (
        <div className="absolute top-20 left-1/2 z-[60] w-[min(90%,32rem)] -translate-x-1/2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700" role="alert">
          <p>{completionError}</p>
          <button
            onClick={() => void handleCompleteSession()}
            disabled={completionInFlightRef.current}
            className="mt-2 font-medium underline disabled:opacity-50"
          >
            Retry saving session
          </button>
        </div>
      )}
      {cancelError && (
        <div className="absolute top-20 left-1/2 z-[60] w-[min(90%,32rem)] -translate-x-1/2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700" role="alert">
          <p>{cancelError}</p>
          <button
            onClick={() => void handleCancelSession()}
            disabled={cancellationInFlightRef.current}
            className="mt-2 font-medium underline disabled:opacity-50"
          >
            Retry cancellation
          </button>
        </div>
      )}

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
    </div>
  )
}
