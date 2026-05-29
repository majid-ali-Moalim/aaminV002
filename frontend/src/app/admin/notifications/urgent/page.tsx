'use client'

import { useState, useEffect } from 'react'
import { Bell, AlertTriangle, AlertCircle, Clock, CheckCircle, XCircle, RefreshCw, Filter, Search } from 'lucide-react'
import { emergencyRequestsService, ambulancesService, employeesService } from '@/lib/api'

export default function UrgentNotificationsPage() {
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState<any[]>([])
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 15000) // Update every 15 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchNotifications = async () => {
    try {
      const [requests, ambulances, employees] = await Promise.all([
        emergencyRequestsService.getAll(),
        ambulancesService.getAll(),
        employeesService.getAll()
      ])

      const urgentNotifications = [
        // Critical emergency requests
        ...requests
          .filter((r: any) => r.priority === 'CRITICAL' && r.status !== 'COMPLETED')
          .map((r: any) => ({
            id: `critical-${r.id}`,
            type: 'critical',
            title: 'Critical Emergency Request',
            message: `Patient: ${r.patientName || 'Unknown'} - Location: ${r.pickupLocation}`,
            timestamp: r.createdAt,
            status: 'active',
            action: `/admin/emergency-requests/${r.id}`,
            priority: 'critical'
          })),

        // Ambulance issues
        ...ambulances
          .filter((a: any) => a.status === 'MAINTENANCE' || (a.fuelLevel && a.fuelLevel < 20))
          .map((a: any) => ({
            id: `ambulance-${a.id}`,
            type: 'warning',
            title: (a.fuelLevel && a.fuelLevel < 20) ? 'Low Fuel Alert' : 'Maintenance Required',
            message: `${a.ambulanceNumber} - ${(a.fuelLevel && a.fuelLevel < 20) ? `Fuel: ${a.fuelLevel}%` : 'Under maintenance'}`,
            timestamp: new Date().toISOString(),
            status: 'warning',
            action: `/admin/ambulances/${a.id}`,
            priority: 'high'
          })),

        // Staff availability issues
        ...employees
          .filter((e: any) => e.shiftStatus !== 'ACTIVE' && e.status === 'ACTIVE')
          .slice(0, 5)
          .map((e: any) => ({
            id: `staff-${e.id}`,
            type: 'info',
            title: 'Staff Availability',
            message: `${e.firstName} ${e.lastName} - Status: ${e.shiftStatus}`,
            timestamp: new Date().toISOString(),
            status: 'info',
            action: `/admin/employees/${e.id}`,
            priority: 'medium'
          })),

        // System alerts (mock data for demonstration)
        {
          id: 'system-1',
          type: 'system',
          title: 'System Performance',
          message: 'Response time monitoring shows 15% increase in average response time',
          timestamp: new Date(Date.now() - 300000).toISOString(),
          status: 'warning',
          action: '/admin/reports/response-time',
          priority: 'high'
        },
        {
          id: 'system-2',
          type: 'system',
          title: 'Database Backup',
          message: 'Scheduled database backup completed successfully',
          timestamp: new Date(Date.now() - 600000).toISOString(),
          status: 'success',
          action: '/admin/system-settings',
          priority: 'low'
        }
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

      setNotifications(urgentNotifications)
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchNotifications()
    setTimeout(() => setRefreshing(false), 1000)
  }

  const filteredNotifications = notifications.filter(notification => {
    const matchesFilter = filter === 'all' || notification.type === filter || notification.priority === filter
    const matchesSearch = notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         notification.message.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'critical':
        return <AlertTriangle className="w-5 h-5 text-red-600" />
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'system':
        return <Bell className="w-5 h-5 text-blue-600" />
      default:
        return <AlertCircle className="w-5 h-5 text-gray-600" />
    }
  }

  const getNotificationColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'border-red-200 bg-red-50'
      case 'high':
        return 'border-orange-200 bg-orange-50'
      case 'medium':
        return 'border-yellow-200 bg-yellow-50'
      case 'low':
        return 'border-green-200 bg-green-50'
      default:
        return 'border-gray-200 bg-gray-50'
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} min ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`
    return date.toLocaleDateString()
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
          <Bell className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Alerts & Notifications</h1>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search notifications..."
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
            <option value="critical">Critical</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
            <option value="system">System</option>
          </select>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <div>
              <p className="text-2xl font-bold text-red-900">
                {notifications.filter(n => n.priority === 'critical').length}
              </p>
              <p className="text-sm text-red-700">Critical</p>
            </div>
          </div>
        </div>
        <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-orange-600" />
            <div>
              <p className="text-2xl font-bold text-orange-900">
                {notifications.filter(n => n.priority === 'high').length}
              </p>
              <p className="text-sm text-orange-700">High Priority</p>
            </div>
          </div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-yellow-600" />
            <div>
              <p className="text-2xl font-bold text-yellow-900">
                {notifications.filter(n => n.priority === 'medium').length}
              </p>
              <p className="text-sm text-yellow-700">Medium Priority</p>
            </div>
          </div>
        </div>
        <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-2xl font-bold text-green-900">
                {notifications.filter(n => n.priority === 'low').length}
              </p>
              <p className="text-sm text-green-700">Low Priority</p>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Alerts</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {filteredNotifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No notifications found</p>
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 border-l-4 ${getNotificationColor(notification.priority)} hover:bg-opacity-80 transition-colors`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">{notification.title}</h3>
                        <p className="text-gray-600 mt-1">{notification.message}</p>
                      </div>
                      <span className="text-xs text-gray-500 whitespace-nowrap ml-4">
                        {formatTimestamp(notification.timestamp)}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        notification.priority === 'critical' ? 'bg-red-100 text-red-800' :
                        notification.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                        notification.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {notification.priority.toUpperCase()}
                      </span>
                      <button
                        onClick={() => window.location.href = notification.action}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        View Details
                      </button>
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
