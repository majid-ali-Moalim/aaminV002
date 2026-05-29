'use client'

import { useState, useEffect } from 'react'
import { History, Clock, User, Activity, Truck, AlertTriangle, CheckCircle, XCircle, Search, Filter, Download } from 'lucide-react'
import { emergencyRequestsService, ambulancesService, employeesService, reportsService } from '@/lib/api'

export default function RecentActivityPage() {
  const [loading, setLoading] = useState(true)
  const [activities, setActivities] = useState<any[]>([])
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [dateRange, setDateRange] = useState('24h')

  useEffect(() => {
    fetchRecentActivity()
    const interval = setInterval(fetchRecentActivity, 30000) // Update every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchRecentActivity = async () => {
    try {
      const [requests, ambulances, employees, dashboardStats] = await Promise.all([
        emergencyRequestsService.getAll(),
        ambulancesService.getAll(),
        employeesService.getAll(),
        reportsService.getDashboardStats()
      ])

      const recentActivities = [
        // Emergency request activities
        ...requests.slice(0, 10).map((request: any) => ({
          id: `request-${request.id}`,
          type: 'emergency',
          action: request.status === 'COMPLETED' ? 'Mission Completed' :
                  request.status === 'ACTIVE' ? 'Mission Started' :
                  request.status === 'ASSIGNED' ? 'Ambulance Assigned' : 'Request Created',
          details: `${request.patientName || 'Unknown'} - ${request.pickupLocation}`,
          user: request.assignedDriver || 'System',
          timestamp: request.createdAt,
          status: request.status === 'COMPLETED' ? 'success' : 'active',
          priority: request.priority,
          entity: 'Emergency Request',
          entityId: request.id
        })),

        // Ambulance activities
        ...ambulances.slice(0, 8).map((ambulance: any) => ({
          id: `ambulance-${ambulance.id}`,
          type: 'ambulance',
          action: ambulance.status === 'AVAILABLE' ? 'Available' :
                  ambulance.status === 'ON_MISSION' ? 'On Mission' :
                  ambulance.status === 'MAINTENANCE' ? 'Maintenance' : 'Unavailable',
          details: `${ambulance.ambulanceNumber} - ${ambulance.station?.name || 'No Station'}`,
          user: 'System',
          timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
          status: ambulance.status === 'AVAILABLE' ? 'success' : 'warning',
          entity: 'Ambulance',
          entityId: ambulance.id
        })),

        // Staff activities
        ...employees.slice(0, 6).map((employee: any) => ({
          id: `staff-${employee.id}`,
          type: 'staff',
          action: employee.shiftStatus === 'ACTIVE' ? 'Shift Started' :
                  employee.shiftStatus === 'OFF_DUTY' ? 'Shift Ended' : 'Status Updated',
          details: `${employee.firstName} ${employee.lastName} - ${employee.department || 'No Department'}`,
          user: employee.firstName,
          timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
          status: employee.shiftStatus === 'ACTIVE' ? 'success' : 'info',
          entity: 'Staff',
          entityId: employee.id
        })),

        // System activities (mock data for demonstration)
        {
          id: 'system-1',
          type: 'system',
          action: 'Database Backup',
          details: 'Automated backup completed successfully',
          user: 'System',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          status: 'success',
          entity: 'System',
          entityId: 'system'
        },
        {
          id: 'system-2',
          type: 'system',
          action: 'Performance Alert',
          details: 'Response time monitoring threshold exceeded',
          user: 'System',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          status: 'warning',
          entity: 'System',
          entityId: 'system'
        },
        {
          id: 'system-3',
          type: 'system',
          action: 'User Login',
          details: 'Admin user logged in successfully',
          user: 'Admin',
          timestamp: new Date(Date.now() - 1800000).toISOString(),
          status: 'info',
          entity: 'Authentication',
          entityId: 'auth'
        }
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

      setActivities(recentActivities)
    } catch (error) {
      console.error('Failed to fetch recent activity:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredActivities = activities.filter(activity => {
    const matchesFilter = filter === 'all' || activity.type === filter || activity.status === filter
    const matchesSearch = activity.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         activity.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         activity.user.toLowerCase().includes(searchTerm.toLowerCase())
    
    // Filter by date range
    const activityDate = new Date(activity.timestamp)
    const now = new Date()
    const diffHours = (now.getTime() - activityDate.getTime()) / (1000 * 60 * 60)
    
    let matchesDateRange = true
    if (dateRange === '1h') matchesDateRange = diffHours <= 1
    else if (dateRange === '24h') matchesDateRange = diffHours <= 24
    else if (dateRange === '7d') matchesDateRange = diffHours <= 168
    else if (dateRange === '30d') matchesDateRange = diffHours <= 720
    
    return matchesFilter && matchesSearch && matchesDateRange
  })

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'emergency':
        return <AlertTriangle className="w-4 h-4 text-red-600" />
      case 'ambulance':
        return <Truck className="w-4 h-4 text-blue-600" />
      case 'staff':
        return <User className="w-4 h-4 text-green-600" />
      case 'system':
        return <Activity className="w-4 h-4 text-purple-600" />
      default:
        return <Clock className="w-4 h-4 text-gray-600" />
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />
      case 'error':
        return <XCircle className="w-4 h-4 text-red-600" />
      default:
        return <Clock className="w-4 h-4 text-blue-600" />
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
  }

  const getTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} min ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`
    return `${Math.floor(diffMins / 1440)} days ago`
  }

  const exportActivity = () => {
    const csvContent = [
      ['Timestamp', 'Action', 'Details', 'User', 'Entity', 'Status'],
      ...filteredActivities.map(activity => [
        formatTimestamp(activity.timestamp),
        activity.action,
        activity.details,
        activity.user,
        activity.entity,
        activity.status
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `recent-activity-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <History className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Recent Activity</h1>
        </div>
        <button
          onClick={exportActivity}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search activities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Types</option>
            <option value="emergency">Emergency</option>
            <option value="ambulance">Ambulance</option>
            <option value="staff">Staff</option>
            <option value="system">System</option>
          </select>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>
      </div>

      {/* Activity Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{activities.length}</p>
              <p className="text-sm text-gray-600">Total Activities</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {activities.filter(a => a.type === 'emergency').length}
              </p>
              <p className="text-sm text-gray-600">Emergency Actions</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {activities.filter(a => a.status === 'success').length}
              </p>
              <p className="text-sm text-gray-600">Successful</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-purple-600" />
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {activities.filter(a => {
                  const diffHours = (new Date().getTime() - new Date(a.timestamp).getTime()) / (1000 * 60 * 60)
                  return diffHours <= 1
                }).length}
              </p>
              <p className="text-sm text-gray-600">Last Hour</p>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Activity Timeline</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {filteredActivities.length === 0 ? (
            <div className="p-8 text-center">
              <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No recent activity found</p>
            </div>
          ) : (
            filteredActivities.map((activity) => (
              <div key={activity.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900">{activity.action}</h3>
                          {getStatusIcon(activity.status)}
                        </div>
                        <p className="text-gray-600 mb-2">{activity.details}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {activity.user}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {getTimeAgo(activity.timestamp)}
                          </span>
                          <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                            {activity.entity}
                          </span>
                        </div>
                      </div>
                      <div className="text-right text-sm text-gray-500 ml-4">
                        {formatTimestamp(activity.timestamp)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
