import Link from 'next/link'
import { Phone, MapPin, Clock, Shield, Activity, Truck, Target } from 'lucide-react'
import { PublicStatsGrid } from '@/components/public/PublicStatsGrid'
import { fetchPublicStats } from '@/lib/public/stats'

export default async function AboutPage() {
  const stats = await fetchPublicStats()

  return (
    <div className="pt-16 pb-12">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-red-50 to-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              About Aamin Ambulance
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Leading emergency medical response in Somalia with state-of-the-art ambulance services 
              and a commitment to saving lives through rapid, professional care.
            </p>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Mission</h2>
              <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                To provide exceptional emergency medical services that save lives and improve health outcomes 
                for all communities across Somalia. We are committed to rapid response, professional care, 
                and compassionate service.
              </p>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                Through our digital Emergency Ambulance Dispatch System (EADS), we're transforming how 
                emergency medical services are coordinated and delivered, ensuring faster response times 
                and better patient outcomes.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/hire-ambulance"
                  className="bg-red-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-red-700 transition-colors"
                >
                  Request Ambulance
                </Link>
                <Link
                  href="/contact"
                  className="bg-gray-200 text-gray-800 px-6 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
                >
                  Contact Us
                </Link>
              </div>
            </div>
            <div className="bg-gradient-to-br from-red-100 to-red-50 rounded-3xl p-8">
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl p-6 shadow-lg">
                  <Target className="w-8 h-8 text-red-600 mb-4" />
                  <h3 className="font-semibold text-gray-900 mb-2">Mission-Driven</h3>
                  <p className="text-sm text-gray-600">Focused on saving lives and serving communities</p>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-lg">
                  <Shield className="w-8 h-8 text-red-600 mb-4" />
                  <h3 className="font-semibold text-gray-900 mb-2">Professional Care</h3>
                  <p className="text-sm text-gray-600">Expert medical staff and modern equipment</p>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-lg">
                  <Clock className="w-8 h-8 text-red-600 mb-4" />
                  <h3 className="font-semibold text-gray-900 mb-2">24/7 Service</h3>
                  <p className="text-sm text-gray-600">Always available when you need us most</p>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-lg">
                  <Activity className="w-8 h-8 text-red-600 mb-4" />
                  <h3 className="font-semibold text-gray-900 mb-2">Rapid Response</h3>
                  <p className="text-sm text-gray-600">Quick deployment to emergency locations</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Our Services</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Comprehensive emergency medical services powered by our advanced dispatch system
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="bg-red-100 rounded-2xl p-4 inline-block mb-6">
                <Truck className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Ambulance Services
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Real-time coordination of our fleet of modern ambulances equipped 
                with advanced medical equipment and staffed by trained professionals.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="bg-red-100 rounded-2xl p-4 inline-block mb-6">
                <MapPin className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Referral Support
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Coordinated patient referrals to appropriate healthcare facilities with 
                real-time status updates and communication between medical teams.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="bg-red-100 rounded-2xl p-4 inline-block mb-6">
                <Activity className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Emergency Dispatch
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Advanced dispatch system ensuring optimal ambulance assignment, route planning, 
                and resource allocation for emergency situations.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="bg-red-100 rounded-2xl p-4 inline-block mb-6">
                <Shield className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Staff Coordination
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Coordinated deployment of drivers, nurses, and emergency responders 
                ensuring optimal team communication in the field.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="bg-red-100 rounded-2xl p-4 inline-block mb-6">
                <Target className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Reporting & Analytics
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Comprehensive reporting system providing insights into operations, 
                performance metrics, and areas for continuous improvement.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Our Impact</h2>
            <p className="text-xl text-gray-600">
              Live operational statistics from the Aamin dispatch system
            </p>
          </div>

          <PublicStatsGrid stats={stats} variant="about" />
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-red-600 to-red-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Join Our Mission?
          </h2>
          <p className="text-xl text-red-100 mb-8 max-w-2xl mx-auto">
            Whether you need emergency services or want to partner with us, we're here to help 
            save lives and serve our community.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/hire-ambulance"
              className="bg-white text-red-600 px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition-colors shadow-lg"
            >
              Request Emergency Service
            </Link>
            <Link
              href="/contact"
              className="bg-red-700 text-white px-8 py-4 rounded-xl font-semibold hover:bg-red-800 transition-colors"
            >
              Contact Our Team
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
