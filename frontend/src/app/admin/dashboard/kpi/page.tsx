'use client'

import { useState, useEffect } from 'react'
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import {
  PieChart as PieChartIcon, TrendingUp, Clock, Users, Truck, Activity,
  AlertTriangle, Shield, Zap, CheckCircle, Target, BarChart2
} from 'lucide-react'
import { reportsService, emergencyRequestsService, ambulancesService, employeesService } from '@/lib/api'

const COLORS = ['#EF4444', '#F59E0B', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899']

function KpiCard({
  icon: Icon, label, value, unit = '', color = 'blue', trend = '', trendUp = true
}: {
  icon: any, label: string, value: string | number, unit?: string, color?: string, trend?: string, trendUp?: boolean
}) {
  const colorMap: Record<string, string> = {
    red: 'bg-red-50 border-red-200 text-red-600',
    green: 'bg-green-50 border-green-200 text-green-600',
    blue: 'bg-blue-50 border-blue-200 text-blue-600',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-600',
    purple: 'bg-purple-50 border-purple-200 text-purple-600',
    orange: 'bg-orange-50 border-orange-200 text-orange-600',
  }
  const cls = colorMap[color] || colorMap.blue

  return (
    <div className={`${cls} border rounded-xl p-5`}>
      <div className="flex items-center justify-between mb-3">
        <Icon className="w-5 h-5" />
        {trend && (
          <span className={`text-xs font-semibold ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
            {trendUp ? '▲' : '▼'} {trend}
          </span>
        )}
      </div>
      <p className="text-3xl font-black text-gray-900">{value}<span className="text-lg font-semibold text-gray-500 ml-1">{unit}</span></p>
      <p className="text-sm text-gray-600 mt-1">{label}</p>
    </div>
  )
}

function ProgressBar({ label, value, target, unit }: { label: string, value: number, target: number, unit: string }) {
  const pct = Math.min((value / (target || 1)) * 100, 100)
  const met = value >= target
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="font-medium text-gray-700">{label}</span>
        <span className={met ? 'text-green-600 font-semibold' : 'text-yellow-600 font-semibold'}>
          {value} {unit} / target {target} {unit}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className={`h-2.5 rounded-full transition-all duration-500 ${met ? 'bg-green-500' : 'bg-yellow-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export default function KPISummaryPage() {
  const [loading, setLoading] = useState(true)
  const [emergencyKPIs, setEmergencyKPIs] = useState<any>({})
  const [performanceMetrics, setPerformanceMetrics] = useState<any>({})
  const [resourceUtilization, setResourceUtilization] = useState<any>({})
  const [weeklyTrends, setWeeklyTrends] = useState<any[]>([])
  const [monthlyTrends, setMonthlyTrends] = useState<any[]>([])
  const [priorityData, setPriorityData] = useState<any[]>([])
  const [ambulanceUtilization, setAmbulanceUtilization] = useState<any[]>([])

  useEffect(() => {
    fetchKPIData()
  }, [])

  const fetchKPIData = async () => {
    try {
      const [
        eKPIs,
        perfMetrics,
        resUtil,
        weekly,
        monthly,
        requests,
        ambulances
      ] = await Promise.all([
        reportsService.getEmergencyKPIs('month').catch(() => ({})),
        reportsService.getPerformanceMetrics().catch(() => ({})),
        reportsService.getResourceUtilization().catch(() => ({})),
        reportsService.getWeeklyTrends().catch(() => ({ data: [] })),
        reportsService.getMonthlyTrends().catch(() => ({ data: [] })),
        emergencyRequestsService.getAll().catch(() => []),
        ambulancesService.getAll().catch(() => [])
      ])

      setEmergencyKPIs(eKPIs)
      setPerformanceMetrics(perfMetrics)
      setResourceUtilization(resUtil)
      setWeeklyTrends((weekly as any).data || [])
      setMonthlyTrends((monthly as any).data || [])

      // Priority distribution from real request data
      const reqList = Array.isArray(requests) ? requests : []
      setPriorityData([
        { name: 'CRITICAL', value: reqList.filter((r: any) => r.priority === 'CRITICAL').length, color: '#EF4444' },
        { name: 'HIGH',     value: reqList.filter((r: any) => r.priority === 'HIGH').length,     color: '#F59E0B' },
        { name: 'MEDIUM',   value: reqList.filter((r: any) => r.priority === 'MEDIUM').length,   color: '#3B82F6' },
        { name: 'LOW',      value: reqList.filter((r: any) => r.priority === 'LOW').length,      color: '#10B981' },
      ])

      // Ambulance utilization from real data
      const ambList = Array.isArray(ambulances) ? ambulances : []
      setAmbulanceUtilization([
        { name: 'Available',   count: ambList.filter((a: any) => a.status === 'AVAILABLE').length,    color: '#10B981' },
        { name: 'On Mission',  count: ambList.filter((a: any) => a.status === 'ON_MISSION').length,   color: '#3B82F6' },
        { name: 'Maintenance', count: ambList.filter((a: any) => a.status === 'MAINTENANCE').length,  color: '#F59E0B' },
        { name: 'Unavailable', count: ambList.filter((a: any) => a.status === 'UNAVAILABLE').length,  color: '#EF4444' },
      ])
    } catch (error) {
      console.error('Failed to fetch KPI data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading KPI data...</p>
        </div>
      </div>
    )
  }

  const successRate = performanceMetrics.successRate ?? 0
  const fleetRate = resourceUtilization.fleetUtilizationRate ?? 0
  const staffRate = resourceUtilization.staffProductivityRate ?? 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-900 to-purple-800 text-white p-6 rounded-xl shadow-xl">
        <div className="flex items-center gap-4">
          <div className="bg-purple-600 p-3 rounded-lg">
            <BarChart2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">KPI Summary</h1>
            <p className="text-purple-200 text-sm mt-1">Live performance metrics from the backend</p>
          </div>
        </div>
      </div>

      {/* Emergency KPIs */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-3">Emergency Metrics</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <KpiCard icon={AlertTriangle} label="Active Emergencies"  value={emergencyKPIs.activeNow ?? 0}              color="red" />
          <KpiCard icon={Clock}         label="Pending Queue"        value={emergencyKPIs.pendingNow ?? 0}             color="yellow" />
          <KpiCard icon={CheckCircle}   label="Completed (Period)"   value={emergencyKPIs.completedInPeriod ?? 0}      color="green" />
          <KpiCard icon={Zap}           label="Critical Cases"       value={emergencyKPIs.criticalInPeriod ?? 0}       color="red" />
        </div>
      </div>

      {/* Performance KPIs */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-3">Performance Metrics</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <KpiCard icon={TrendingUp}    label="Success Rate"         value={successRate}    unit="%" color="green"  />
          <KpiCard icon={Shield}        label="Fleet Utilization"    value={fleetRate}      unit="%" color="blue"   />
          <KpiCard icon={Users}         label="Staff on Shift"       value={staffRate}      unit="%" color="purple" />
          <KpiCard icon={Activity}      label="System Efficiency"    value={performanceMetrics.systemEfficiency ?? 0} unit="%" color="indigo" />
        </div>
      </div>

      {/* Resource KPIs */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-3">Resource Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <KpiCard icon={Truck} label="Total Ambulances"       value={resourceUtilization.totalAmbulances ?? 0}      color="blue"   />
          <KpiCard icon={Truck} label="Available Ambulances"   value={resourceUtilization.availableAmbulances ?? 0}  color="green"  />
          <KpiCard icon={Users} label="Total Staff"            value={resourceUtilization.totalEmployees ?? 0}        color="purple" />
          <KpiCard icon={Users} label="Active Staff"           value={resourceUtilization.activeEmployees ?? 0}       color="green"  />
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Trend Bar Chart */}
        <div className="bg-white p-6 rounded-xl shadow border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Weekly Emergency Trend</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={weeklyTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="requests"  fill="#EF4444" name="Requests"  radius={[4,4,0,0]} />
              <Bar dataKey="completed" fill="#10B981" name="Completed" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Success Rate */}
        <div className="bg-white p-6 rounded-xl shadow border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Success Rate (%)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={monthlyTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Line type="monotone" dataKey="successRate" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} name="Success %" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Priority Distribution Pie */}
        <div className="bg-white p-6 rounded-xl shadow border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Priority Distribution</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={priorityData}
                cx="50%" cy="50%"
                outerRadius={90}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
              >
                {priorityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Ambulance Utilization Donut */}
        <div className="bg-white p-6 rounded-xl shadow border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Ambulance Status</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={ambulanceUtilization}
                cx="50%" cy="50%"
                innerRadius={60} outerRadius={90}
                paddingAngle={4}
                dataKey="count"
              >
                {ambulanceUtilization.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Performance vs Targets */}
      <div className="bg-white p-6 rounded-xl shadow border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <Target className="w-5 h-5 text-blue-600" />
          Performance vs. Targets
        </h3>
        <div className="space-y-5">
          <ProgressBar label="Mission Success Rate"    value={successRate}  target={95}  unit="%" />
          <ProgressBar label="Fleet Utilization"       value={fleetRate}    target={80}  unit="%" />
          <ProgressBar label="Staff Productivity"      value={staffRate}    target={75}  unit="%" />
          <ProgressBar label="System Efficiency"       value={performanceMetrics.systemEfficiency ?? 0} target={85} unit="%" />
        </div>
      </div>

      {/* Summary Insight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-50 border border-blue-200 p-6 rounded-xl">
          <div className="flex items-center gap-3 mb-3">
            <TrendingUp className="w-6 h-6 text-blue-600" />
            <h3 className="font-semibold text-blue-900">Performance Trend</h3>
          </div>
          <p className="text-blue-800 text-sm">
            System efficiency at <strong>{performanceMetrics.systemEfficiency ?? 0}%</strong>.
            {(performanceMetrics.systemEfficiency ?? 0) >= 80
              ? ' Operating above target thresholds.'
              : ' Below 80% target — review resource allocation.'}
          </p>
        </div>

        <div className={`${successRate >= 90 ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'} border p-6 rounded-xl`}>
          <div className="flex items-center gap-3 mb-3">
            <Activity className={`w-6 h-6 ${successRate >= 90 ? 'text-green-600' : 'text-yellow-600'}`} />
            <h3 className={`font-semibold ${successRate >= 90 ? 'text-green-900' : 'text-yellow-900'}`}>Mission Success Rate</h3>
          </div>
          <p className={`text-sm ${successRate >= 90 ? 'text-green-800' : 'text-yellow-800'}`}>
            <strong>{successRate}%</strong> success rate {successRate >= 95 ? '— exceeding the 95% target.' : successRate >= 90 ? '— close to the 95% target.' : '— needs improvement to reach 95% target.'}
          </p>
        </div>

        <div className={`${fleetRate >= 80 ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'} border p-6 rounded-xl`}>
          <div className="flex items-center gap-3 mb-3">
            <Truck className={`w-6 h-6 ${fleetRate >= 80 ? 'text-green-600' : 'text-orange-600'}`} />
            <h3 className={`font-semibold ${fleetRate >= 80 ? 'text-green-900' : 'text-orange-900'}`}>Fleet Readiness</h3>
          </div>
          <p className={`text-sm ${fleetRate >= 80 ? 'text-green-800' : 'text-orange-800'}`}>
            <strong>{resourceUtilization.availableAmbulances ?? 0}</strong> of <strong>{resourceUtilization.totalAmbulances ?? 0}</strong> ambulances available.
            Fleet utilization at <strong>{fleetRate}%</strong>.
          </p>
        </div>
      </div>
    </div>
  )
}
