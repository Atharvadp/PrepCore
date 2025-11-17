import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import StatCard from '../components/analytics/StatCard'
import StreakDisplay from '../components/analytics/StreakDisplay'
import { Clock, Target, TrendingUp, Award } from 'lucide-react'

interface AnalyticsData {
  totalSessions: number
  totalMinutes: number
  completedTasks: number
  averageSessionLength: number
  thisWeekMinutes: number
  thisWeekSessions: number
}

export default function Analytics() {
  const { user } = useAuth()
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalSessions: 0,
    totalMinutes: 0,
    completedTasks: 0,
    averageSessionLength: 0,
    thisWeekMinutes: 0,
    thisWeekSessions: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics()
  }, [user])

  const fetchAnalytics = async () => {
    try {
      // Fetch all completed sessions
      const { data: sessions, error: sessionsError } = await supabase
        .from('study_sessions')
        .select('duration_minutes, started_at, completed')
        .eq('user_id', user?.id)
        .eq('completed', true)

      if (sessionsError) throw sessionsError

      // Fetch completed tasks
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('is_completed')
        .eq('user_id', user?.id)
        .eq('is_completed', true)

      if (tasksError) throw tasksError

      // Calculate analytics
      const totalSessions = sessions?.length || 0
      const totalMinutes =
        sessions?.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) || 0
      const completedTasks = tasks?.length || 0
      const averageSessionLength = totalSessions > 0 ? Math.round(totalMinutes / totalSessions) : 0

      // Calculate this week's data
      const oneWeekAgo = new Date()
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

      const thisWeekSessions =
        sessions?.filter((s) => new Date(s.started_at) >= oneWeekAgo) || []
      const thisWeekMinutes = thisWeekSessions.reduce(
        (sum, s) => sum + (s.duration_minutes || 0),
        0
      )

      setAnalytics({
        totalSessions,
        totalMinutes,
        completedTasks,
        averageSessionLength,
        thisWeekMinutes,
        thisWeekSessions: thisWeekSessions.length,
      })
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatHours = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours === 0) return `${mins}m`
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-32 bg-gray-200 rounded-xl"></div>
          <div className="h-32 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Your Study Analytics</h1>
        <p className="text-gray-600">Track your progress and stay motivated</p>
      </div>

      {/* Streak Section */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Your Streaks</h2>
        <StreakDisplay />
      </div>

      {/* This Week Stats */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-800 mb-4">This Week</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <StatCard
            title="Study Time"
            value={formatHours(analytics.thisWeekMinutes)}
            subtitle="Total minutes studied this week"
            icon={<Clock className="text-white" size={24} />}
            color="bg-blue-500"
          />
          <StatCard
            title="Sessions"
            value={analytics.thisWeekSessions}
            subtitle="Focus sessions completed"
            icon={<TrendingUp className="text-white" size={24} />}
            color="bg-green-500"
          />
        </div>
      </div>

      {/* All Time Stats */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-800 mb-4">All Time</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <StatCard
            title="Total Study Time"
            value={formatHours(analytics.totalMinutes)}
            subtitle="Across all sessions"
            icon={<Clock className="text-white" size={24} />}
            color="bg-purple-500"
          />
          <StatCard
            title="Total Sessions"
            value={analytics.totalSessions}
            subtitle="Completed focus sessions"
            icon={<TrendingUp className="text-white" size={24} />}
            color="bg-indigo-500"
          />
          <StatCard
            title="Tasks Completed"
            value={analytics.completedTasks}
            subtitle="Tasks marked as done"
            icon={<Target className="text-white" size={24} />}
            color="bg-cyan-500"
          />
        </div>
      </div>

      {/* Average Stats */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Averages</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <StatCard
            title="Average Session"
            value={`${analytics.averageSessionLength} min`}
            subtitle="Your typical focus session length"
            icon={<Award className="text-white" size={24} />}
            color="bg-orange-500"
          />
          <StatCard
            title="Weekly Average"
            value={formatHours(Math.round(analytics.thisWeekMinutes / 7))}
            subtitle="Average daily study time (last 7 days)"
            icon={<TrendingUp className="text-white" size={24} />}
            color="bg-pink-500"
          />
        </div>
      </div>

      {/* Motivational Message */}
      {analytics.totalSessions === 0 ? (
        <div className="bg-calm rounded-xl p-8 text-center">
          <h3 className="text-xl font-bold text-primary mb-2">
            Start Your First Session! 🚀
          </h3>
          <p className="text-gray-600">
            Complete focus sessions to see your analytics and track your progress
          </p>
        </div>
      ) : (
        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-8 text-center">
          <h3 className="text-xl font-bold text-green-700 mb-2">
            Keep Up the Great Work! 🎉
          </h3>
          <p className="text-gray-700">
            You've studied for <strong>{formatHours(analytics.totalMinutes)}</strong> across{' '}
            <strong>{analytics.totalSessions}</strong> sessions. That's amazing progress!
          </p>
        </div>
      )}
    </div>
  )
}
