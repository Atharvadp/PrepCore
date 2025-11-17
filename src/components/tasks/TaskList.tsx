import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import type { Task } from '../../types'
import TaskCard from './TaskCard'
import TaskForm from './TaskForm'
import { Plus, ListTodo } from 'lucide-react'

export default function TaskList() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all')

  useEffect(() => {
    fetchTasks()
  }, [user])

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setTasks(data || [])
    } catch (err) {
      console.error('Error fetching tasks:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredTasks = tasks.filter((task) => {
    if (filter === 'active') return !task.is_completed
    if (filter === 'completed') return task.is_completed
    return true
  })

  const stats = {
    total: tasks.length,
    active: tasks.filter((t) => !t.is_completed).length,
    completed: tasks.filter((t) => t.is_completed).length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">My Tasks</h2>
          <p className="text-sm text-gray-600 mt-1">
            {stats.active} active, {stats.completed} completed
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all btn-scale"
        >
          <Plus size={20} />
          <span>New Task</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {(['all', 'active', 'completed'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-2 font-medium capitalize transition-colors ${
              filter === tab
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Task List or Empty State */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-16 animate-fadeIn">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-calm mb-6">
            <ListTodo className="text-primary" size={40} />
          </div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            {filter === 'all' ? 'No tasks yet' : `No ${filter} tasks`}
          </h3>
          <p className="text-gray-500 mb-6">
            {filter === 'all'
              ? 'Create your first task to get started on your study journey!'
              : `Switch to "All" to see your tasks.`}
          </p>
          {filter === 'all' && (
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all btn-scale inline-flex items-center gap-2"
            >
              <Plus size={20} />
              Create Your First Task
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onTaskUpdated={fetchTasks}
              onTaskDeleted={fetchTasks}
            />
          ))}
        </div>
      )}

      {/* Task Form Modal */}
      {showForm && (
        <TaskForm onClose={() => setShowForm(false)} onTaskCreated={fetchTasks} />
      )}
    </div>
  )
}
