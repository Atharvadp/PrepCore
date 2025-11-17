import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import type { Task } from '../../types'
import { Clock, Play, ListTodo } from 'lucide-react'

interface SessionSetupProps {
  onStartSession: (duration: number, taskId: string | null) => void
}

export default function SessionSetup({ onStartSession }: SessionSetupProps) {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [duration, setDuration] = useState(25)

  useEffect(() => {
    fetchActiveTasks()
  }, [user])

  const fetchActiveTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_completed', false)
        .order('created_at', { ascending: false })

      if (error) throw error
      setTasks(data || [])
    } catch (err) {
      console.error('Error fetching tasks:', err)
    }
  }

  const handleStart = () => {
    onStartSession(duration, selectedTaskId)
  }

  const durationOptions = [15, 25, 30, 45, 60]

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
          <div className="grid grid-cols-5 gap-3">
            {durationOptions.map((min) => (
              <button
                key={min}
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
          </div>
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
          {tasks.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">
              No active tasks. You can still start a session!
            </p>
          )}
        </div>

        {/* Start Button */}
        <button
          onClick={handleStart}
          className="w-full bg-primary text-white py-4 rounded-xl font-semibold text-lg hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-lg"
        >
          <Play size={24} />
          Start Focus Session
        </button>
      </div>
    </div>
  )
}
