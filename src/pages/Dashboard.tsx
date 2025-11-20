import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Play, ListTodo, Bot } from 'lucide-react'
import StreakDisplay from '../components/analytics/StreakDisplay'

export default function Dashboard() {
  const { user: _user } = useAuth()
  const navigate = useNavigate()

  const mainFeatures = [
    {
      title: 'Focus Sessions',
      description: 'Start deep work timer with distraction-free interface',
      icon: Play,
      color: 'bg-purple-500',
      path: '/focus',
    },
    {
      title: 'Study Tasks',
      description: 'Organize and track your study goals',
      icon: ListTodo,
      color: 'bg-blue-500',
      path: '/tasks',
    },
    {
      title: 'AI Helper',
      description: 'Get instant answers to your study questions',
      icon: Bot,
      color: 'bg-green-500',
      path: '/ai-assistant',
    },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-12 animate-fadeIn">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
          Welcome back! 👋
        </h2>
        <p className="text-lg text-gray-600">
          Choose where you want to start today
        </p>
      </div>

      {/* Main 3 Features */}
      <div className="grid md:grid-cols-3 gap-6 mb-12">
        {mainFeatures.map((feature, index) => {
          const Icon = feature.icon
          return (
            <button
              key={feature.path}
              onClick={() => navigate(feature.path)}
              className="bg-surface border-2 border-gray-200 rounded-2xl p-8 hover:border-primary hover:shadow-2xl transition-all text-center group btn-scale animate-fadeIn"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div
                className={`w-16 h-16 ${feature.color} rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform`}
              >
                <Icon className="text-white" size={32} />
              </div>
              <h3 className="font-bold text-xl mb-2 text-gray-800">
                {feature.title}
              </h3>
              <p className="text-sm text-gray-600">{feature.description}</p>
            </button>
          )
        })}
      </div>

      {/* Streak Display */}
      <div className="mt-12 animate-fadeIn" style={{ animationDelay: '0.3s' }}>
        <div className="text-center mb-6">
          <h3 className="text-2xl font-bold text-gray-800">Your Progress</h3>
          <p className="text-gray-600">Keep your streak alive by studying every day!</p>
        </div>
        <StreakDisplay />
      </div>
    </div>
  )
}
