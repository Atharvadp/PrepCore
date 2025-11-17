interface StatCardProps {
  title: string
  value: string | number
  subtitle: string
  icon: React.ReactNode
  color: string
}

export default function StatCard({ title, value, subtitle, icon, color }: StatCardProps) {
  return (
    <div className="bg-surface rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        <div className={`${color} p-2 rounded-lg`}>{icon}</div>
      </div>
      <div className="mb-2">
        <p className="text-3xl font-bold text-gray-800">{value}</p>
      </div>
      <p className="text-sm text-gray-500">{subtitle}</p>
    </div>
  )
}
