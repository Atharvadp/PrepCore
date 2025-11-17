import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import { CheckCircle, Clock, Target, Flame } from 'lucide-react'

interface SessionSummaryProps {
  duration: number
  taskTitle?: string
  onClose: () => void
}

export default function SessionSummary({
  duration,
  taskTitle,
  onClose,
}: SessionSummaryProps) {
  const { user } = useAuth()
  const [currentStreak, setCurrentStreak] = useState(0)

  useEffect(() => {
    fetchStreak()
  }, [])

  const fetchStreak = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('current_streak')
      .eq('id', user?.id)
      .single()

    if (data) {
      setCurrentStreak(data.current_streak)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
        <CheckCircle className="mx-auto text-green-500 mb-6" size={80} />
        
        <h2 className="text-3xl font-bold text-gray-800 mb-2">
          Session Complete! 🎉
        </h2>
        <p className="text-gray-600 mb-8">Great work staying focused!</p>

        <div className="space-y-4 mb-8">
          <div className="flex items-center justify-center gap-3 text-gray-700">
            <Clock className="text-primary" size={24} />
            <span className="text-lg">
              <strong>{duration}</strong> minutes studied
            </span>
          </div>

          {taskTitle && (
            <div className="flex items-center justify-center gap-3 text-gray-700">
              <Target className="text-primary" size={24} />
              <span className="text-lg">
                Worked on: <strong>{taskTitle}</strong>
              </span>
            </div>
          )}

          {/* Streak Display */}
          <div className="flex items-center justify-center gap-3 text-gray-700 bg-orange-50 border-2 border-orange-200 rounded-xl py-3 px-4">
            <Flame className="text-orange-500" size={24} />
            <span className="text-lg">
              <strong>{currentStreak}</strong> day streak! 🔥
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary/90 transition-all"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  )
}
