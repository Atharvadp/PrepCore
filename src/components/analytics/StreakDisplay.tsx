import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import { Flame, Award } from 'lucide-react'
import LoadingSpinner from '../layout/LoadingSpinner'

export default function StreakDisplay() {
  const { user } = useAuth()
  const [currentStreak, setCurrentStreak] = useState(0)
  const [longestStreak, setLongestStreak] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStreak()
  }, [user])

  const fetchStreak = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('current_streak, longest_streak')
        .eq('id', user?.id)
        .single()

      if (error) throw error

      setCurrentStreak(data?.current_streak || 0)
      setLongestStreak(data?.longest_streak || 0)
    } catch (error) {
      console.error('Error fetching streak:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <LoadingSpinner message="Loading streaks..." />
  }

  return (
    <div className="grid md:grid-cols-2 gap-6 animate-fadeIn">
      {/* Current Streak */}
      <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl p-6 text-white shadow-lg hover:shadow-2xl transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <Flame size={40} />
          <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full">
            Current
          </span>
        </div>
        <h3 className="text-lg font-semibold mb-1">Daily Streak</h3>
        <div className="flex items-baseline gap-2">
          <span className="text-5xl font-bold">{currentStreak}</span>
          <span className="text-2xl opacity-80">days</span>
        </div>
        <p className="text-sm mt-3 opacity-90">
          {currentStreak === 0
            ? 'Complete a session to start your streak!'
            : currentStreak === 1
            ? 'Great start! Keep going tomorrow!'
            : `Amazing! You're on fire! 🔥`}
        </p>
      </div>

      {/* Longest Streak */}
      <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl p-6 text-white shadow-lg hover:shadow-2xl transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <Award size={40} />
          <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full">
            Record
          </span>
        </div>
        <h3 className="text-lg font-semibold mb-1">Longest Streak</h3>
        <div className="flex items-baseline gap-2">
          <span className="text-5xl font-bold">{longestStreak}</span>
          <span className="text-2xl opacity-80">days</span>
        </div>
        <p className="text-sm mt-3 opacity-90">
          {longestStreak === 0
            ? 'Your personal best will appear here'
            : longestStreak === currentStreak
            ? `You're at your peak! 🏆`
            : `Can you beat your record?`}
        </p>
      </div>
    </div>
  )
}
