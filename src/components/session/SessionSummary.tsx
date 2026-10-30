import { useEffect, useState } from 'react'
import { apiRequest } from '../../lib/api'
import { CheckCircle, Clock, Target, Flame } from 'lucide-react'
import type { Profile } from '../../types'

interface SessionSummaryProps {
  duration: number
  taskTitle?: string
  onClose: () => void
}

interface ProfileResponse {
  profile: Pick<Profile, 'current_streak'>
}

export default function SessionSummary({
  duration,
  taskTitle,
  onClose,
}: SessionSummaryProps) {
  const [currentStreak, setCurrentStreak] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    void apiRequest<ProfileResponse>('/profile', { signal: controller.signal })
      .then(({ profile }) => setCurrentStreak(profile.current_streak))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          console.error('Error fetching streak:', error)
        }
      })

    return () => controller.abort()
  }, [])

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
