import Link from 'next/link'
import { Phone, MapPin, Shield, Users, Activity } from 'lucide-react'
import { PublicStatsGrid } from '@/components/public/PublicStatsGrid'
import { fetchPublicStats } from '@/lib/public/stats'

export default async function Home() {
  const stats = await fetchPublicStats()

  return (
    <div className="pt-16">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-red-50 to-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
                Welcome to
                <span className="text-red-600"> Aamin Ambulance</span>
              </h1>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Fast, Reliable, and Life-Saving Emergency Response. 
                Professional ambulance services and emergency medical dispatch support available 24/7 across Somalia.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <Link
                  href="/hire-ambulance"
                  className="bg-red-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-red-700 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200"
                >
                  Request Ambulance
                </Link>
                <Link
                  href="/login"
                  className="bg-white text-red-600 px-8 py-4 rounded-xl font-semibold border-2 border-red-600 hover:bg-red-50 transition-colors"
                >
                  Admin Portal
                </Link>
              </div>

              {/* Emergency Contact */}
              <div className="bg-red-600 text-white p-6 rounded-2xl inline-flex items-center space-x-4 shadow-xl">
                <Phone className="w-8 h-8" />
                <div>
                  <p className="text-sm font-medium opacity-90">Emergency Hotline</p>
                  <p className="text-2xl font-bold">999</p>
                </div>
              </div>
            </div>

            {/* Hero Visual */}
            <div className="relative">
              <div className="bg-gradient-to-br from-red-100 to-red-50 rounded-3xl p-8 shadow-xl">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-2xl p-6 shadow-lg">
                    <Activity className="w-8 h-8 text-red-600 mb-3" />
                    <h3 className="font-semibold text-gray-900 mb-1">Quick Response</h3>
                    <p className="text-sm text-gray-600">Rapid dispatch when every minute counts</p>
                  </div>
                  <div className="bg-white rounded-2xl p-6 shadow-lg">
                    <Users className="w-8 h-8 text-red-600 mb-3" />
                    <h3 className="font-semibold text-gray-900 mb-1">Field Crew</h3>
                    <p className="text-sm text-gray-600">
                      {stats.drivers.toLocaleString()} drivers · {stats.nurses.toLocaleString()} nurses
                    </p>
                  </div>
                  <div className="bg-white rounded-2xl p-6 shadow-lg">
                    <Shield className="w-8 h-8 text-red-600 mb-3" />
                    <h3 className="font-semibold text-gray-900 mb-1">Fully Equipped</h3>
                    <p className="text-sm text-gray-600">{stats.ambulances.toLocaleString()} active ambulances</p>
                  </div>
                  <div className="bg-white rounded-2xl p-6 shadow-lg">
                    <MapPin className="w-8 h-8 text-red-600 mb-3" />
                    <h3 className="font-semibold text-gray-900 mb-1">Wide Coverage</h3>
                    <p className="text-sm text-gray-600">All major regions</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Why Choose Aamin Ambulance?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We provide comprehensive emergency medical services with a focus on speed, 
              professionalism, and patient care.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="bg-red-100 rounded-2xl p-4 inline-block mb-6">
                <Activity className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                24/7 Emergency Service
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Round-the-clock emergency medical response with dedicated dispatch team
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="bg-red-100 rounded-2xl p-4 inline-block mb-6">
                <Users className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Drivers & Nurses
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Active drivers and nurses providing emergency medical care in the field
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="bg-red-100 rounded-2xl p-4 inline-block mb-6">
                <Shield className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Modern Fleet
              </h3>
              <p className="text-gray-600 leading-relaxed">
                State-of-the-art ambulances equipped with advanced medical equipment
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="bg-red-100 rounded-2xl p-4 inline-block mb-6">
                <MapPin className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Wide Coverage
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Serving all major cities and regions across Somalia
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="bg-red-100 rounded-2xl p-4 inline-block mb-6">
                <Phone className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Easy Booking
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Simple ambulance booking through our online request form
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Trusted by Thousands
            </h2>
            <p className="text-xl text-gray-600">
              Live operational statistics from the Aamin dispatch system
            </p>
          </div>

          <PublicStatsGrid stats={stats} variant="home" />
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-red-600 to-red-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Need Emergency Medical Assistance?
          </h2>
          <p className="text-xl text-red-100 mb-8 max-w-2xl mx-auto">
            Don't wait in critical situations. Our professional team is ready to respond 
            to your emergency needs 24/7.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/hire-ambulance"
              className="bg-white text-red-600 px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition-colors shadow-lg"
            >
              Request Ambulance Now
            </Link>
            <div className="bg-white/20 backdrop-blur-sm text-white px-8 py-4 rounded-xl font-semibold flex items-center justify-center space-x-3">
              <Phone className="w-5 h-5" />
              <span>Call 999</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
