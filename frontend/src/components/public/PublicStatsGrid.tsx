import {
  type PublicStats,
  formatPublicCount,
} from '@/lib/public/stats'

type PublicStatsGridVariant = 'home' | 'about'

interface PublicStatsGridProps {
  stats: PublicStats
  variant?: PublicStatsGridVariant
}

export function PublicStatsGrid({ stats, variant = 'home' }: PublicStatsGridProps) {
  const homeItems = [
    { value: formatPublicCount(stats.emergencyCalls), label: 'Emergency Calls' },
    { value: formatPublicCount(stats.ambulances), label: 'Ambulances' },
    { value: formatPublicCount(stats.drivers), label: 'Drivers' },
    { value: formatPublicCount(stats.nurses), label: 'Nurses' },
    { value: formatPublicCount(stats.completedCases), label: 'Completed Cases' },
  ]

  const aboutItems = [
    { value: formatPublicCount(stats.completedCases), label: 'Completed Cases' },
    { value: formatPublicCount(stats.drivers), label: 'Drivers' },
    { value: formatPublicCount(stats.nurses), label: 'Nurses' },
    { value: formatPublicCount(stats.ambulances), label: 'Ambulances' },
    { value: '24/7', label: 'Service Available' },
  ]

  const items = variant === 'about' ? aboutItems : homeItems

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
      {items.map((item) => (
        <div key={item.label} className="text-center">
          <div className="text-4xl font-bold text-red-600 mb-2">{item.value}</div>
          <div className="text-gray-600">{item.label}</div>
        </div>
      ))}
    </div>
  )
}
