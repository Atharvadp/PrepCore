import { useState } from 'react'
import { apiRequest, getApiErrorMessage } from '../../lib/api'
import type { Task } from '../../types'
import { CheckCircle, Circle, Trash2, BookOpen } from 'lucide-react'
import ConfirmDialog from '../layout/ConfirmDialog'

interface TaskCardProps {
  task: Task
  onTaskUpdated: () => void
  onTaskDeleted: () => void
}

export default function TaskCard({ task, onTaskUpdated, onTaskDeleted }: TaskCardProps) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleToggle = async () => {
    setError('')
    setLoading(true)
    try {
      await apiRequest<{ task: Task }>(`/tasks/${encodeURIComponent(task.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_completed: !task.is_completed }),
      })
      onTaskUpdated()
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'Unable to update task. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    setError('')
    setLoading(true)
    try {
      await apiRequest<{ message: string }>(`/tasks/${encodeURIComponent(task.id)}`, {
        method: 'DELETE',
      })
      onTaskDeleted()
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'Unable to delete task. Please try again.'))
    } finally {
      setLoading(false)
      setShowConfirm(false)
    }
  }

  return (
    <>
      <div className="bg-surface border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow animate-fadeIn">
        <div className="flex items-start gap-3">
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <button
            onClick={handleToggle}
            disabled={loading}
            className="mt-0.5 text-primary hover:scale-110 transition-transform"
          >
            {task.is_completed ? <CheckCircle size={24} /> : <Circle size={24} />}
          </button>

          <div className="flex-1">
            <h3
              className={`font-semibold text-gray-800 ${
                task.is_completed ? 'line-through text-gray-400' : ''
              }`}
            >
              {task.title}
            </h3>
            {task.description && (
              <p className="text-sm text-gray-600 mt-1">{task.description}</p>
            )}
            {task.subject && (
              <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                <BookOpen size={16} />
                <span>{task.subject}</span>
              </div>
            )}
          </div>

          <button
            onClick={() => setShowConfirm(true)}
            disabled={loading}
            className="text-red-500 hover:text-red-700 hover:scale-110 transition-all"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      {showConfirm && (
        <ConfirmDialog
          message="Are you sure you want to delete this task?"
          onConfirm={handleDelete}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  )
}
