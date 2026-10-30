import { useState, useEffect, useCallback } from 'react'
import { apiRequest, getApiErrorMessage } from '../../lib/api'
import { useAuth } from '../../contexts/useAuth'
import type { Task } from '../../types'
import { Clock, Play, ListTodo } from 'lucide-react'
import {
  MAX_SESSION_DURATION,
  MIN_SESSION_DURATION,
  parseCustomSessionDuration,
  SESSION_DURATION_PRESETS,
} from '../../utils/sessionDuration'

interface SessionSetupProps {
  onStartSession: (duration: number, taskId: string | null) => void
}

export default function SessionSetup({ onStartSession }: SessionSetupProps) {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [duration, setDuration] = useState<number | 'custom'>(15)
  const [customDuration, setCustomDuration] = useState('')
  const [tasksLoading, setTasksLoading] = useState(true)
  const [tasksError, setTasksError] = useState('')

  const fetchActiveTasks = useCallback(async () => {
    if (!user) {
      setTasks([])
      setTasksLoading(false)
      return
    }

    setTasksLoading(true)
    setTasksError('')
    try {
      const { tasks: activeTasks } = await apiRequest<{ tasks: Task[] }>(
        '/tasks?is_completed=false',
      )
      setTasks(activeTasks)
    } catch (error: unknown) {
      setTasksError(getApiErrorMessage(error, 'Unable to load active tasks. Please try again.'))
    } finally {
      setTasksLoading(false)
    }
  }, [user])

  useEffect(() => {
    void fetchActiveTasks()
  }, [fetchActiveTasks])

  const handleStart = () => {
    const selectedDuration =
      duration === 'custom' ? parseCustomSessionDuration(customDuration) : duration
    if (selectedDuration === undefined) {
      return
    }
    onStartSession(selectedDuration, selectedTaskId)
  }

  const selectedDuration =
    duration === 'custom' ? parseCustomSessionDuration(customDuration) : duration
  const durationError =
    duration === 'custom' && selectedDuration === undefined
      ? `Enter a whole number from ${MIN_SESSION_DURATION} to ${MAX_SESSION_DURATION} minutes.`
      : ''

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="bg-surface rounded-2xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Start a Focus Session
          </h1>
          <p className="text-gray-600">
            Choose your study duration and optional task
          </p>
        </div>

        {/* Duration Selection */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            <Clock className="inline mr-2" size={18} />
            Session Duration (minutes)
          </label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {SESSION_DURATION_PRESETS.map((min) => (
              <button
                key={min}
                type="button"
                onClick={() => setDuration(min)}
                className={`py-3 rounded-lg font-medium transition-all ${
                  duration === min
                    ? 'bg-primary text-white shadow-md scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {min}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setDuration('custom')}
              aria-pressed={duration === 'custom'}
              className={`col-span-2 py-3 rounded-lg font-medium transition-all sm:col-span-1 ${
                duration === 'custom'
                  ? 'bg-primary text-white shadow-md scale-105'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Custom
            </button>
          </div>
          {duration === 'custom' && (
            <div className="mt-4">
              <label htmlFor="custom-session-duration" className="mb-2 block text-sm font-medium text-gray-700">
                Custom duration in minutes
              </label>
              <input
                id="custom-session-duration"
                type="number"
                inputMode="numeric"
                min={MIN_SESSION_DURATION}
                max={MAX_SESSION_DURATION}
                step="1"
                value={customDuration}
                onChange={(event) => setCustomDuration(event.target.value)}
                aria-invalid={Boolean(durationError)}
                aria-describedby={durationError ? 'custom-session-duration-error' : undefined}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-800 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Enter 1–1440 minutes"
              />
              {durationError && (
                <p id="custom-session-duration-error" className="mt-2 text-sm text-red-600" role="alert">
                  {durationError}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Task Selection */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            <ListTodo className="inline mr-2" size={18} />
            Select Task (Optional)
          </label>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            <button
              onClick={() => setSelectedTaskId(null)}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                selectedTaskId === null
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              No specific task
            </button>
            {tasks.map((task) => (
              <button
                key={task.id}
                onClick={() => setSelectedTaskId(task.id)}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                  selectedTaskId === task.id
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <div className="font-medium">{task.title}</div>
                <div className="text-sm opacity-80">{task.subject}</div>
              </button>
            ))}
          </div>
          {tasksLoading && (
            <p className="text-sm text-gray-500 text-center py-4">Loading active tasks...</p>
          )}
          {tasksError && (
            <div className="text-sm text-red-600 text-center py-3" role="alert">
              <p>{tasksError}</p>
              <button onClick={() => void fetchActiveTasks()} className="mt-1 underline">
                Retry
              </button>
            </div>
          )}
          {!tasksLoading && !tasksError && tasks.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">
              No active tasks. You can still start a session!
            </p>
          )}
        </div>

        {/* Start Button */}
        <button
          onClick={handleStart}
          disabled={selectedDuration === undefined}
          className="w-full bg-primary text-white py-4 rounded-xl font-semibold text-lg hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Play size={24} />
          Start Focus Session
        </button>
      </div>
    </div>
  )
}
