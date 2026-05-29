'use client'

export default function DispatcherSparkline({ data, color }: { data: number[]; color: string }) {
  if (!data.length) return null
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const width = 100
  const height = 30

  const points = data
    .map((val, i) => {
      const x = (i / Math.max(data.length - 1, 1)) * width
      const y = height - ((val - min) / range) * height
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg viewBox={`0 -5 ${width} ${height + 10}`} className="w-full h-12 preserve-aspect-ratio-none">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  )
}
