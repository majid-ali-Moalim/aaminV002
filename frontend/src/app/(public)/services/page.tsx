import Link from 'next/link'
import { Phone, MapPin, Clock, Users, Shield, Activity, Truck, FileText, AlertCircle } from 'lucide-react'
import { PUBLIC_HEADER_OFFSET } from '@/lib/layout/publicHeader'

export default function ServicesPage() {
  const services = [
    {
      icon: Truck,
      title: 'Ambulance Dispatch',
      description: 'Rapid deployment of ambulances to emergency locations with real-time tracking and optimal route planning.',
      features: ['GPS tracking', 'Real-time updates', 'Optimal routing', '24/7 availability']
    },
    {
      icon: Users,
      title: 'Patient Request Handling',
      description: 'Efficient processing of emergency requests with priority assessment and immediate response coordination.',
      features: ['Priority triage', 'Quick assessment', 'Immediate dispatch', 'Status tracking']
    },
    {
      icon: Shield,
      title: 'Pre-Hospital Support',
      description: 'Professional medical care during transport with trained paramedics and advanced life support equipment.',
      features: ['Paramedic care', 'Life support', 'Medical equipment', 'Stabilization']
    },
    {
      icon: MapPin,
      title: 'Referral Coordination',
      description: 'Seamless coordination with hospitals and healthcare facilities for patient referrals and transfers.',
      features: ['Hospital network', 'Bed availability', 'Medical records', 'Direct admission']
    },
    {
      icon: Activity,
      title: 'Staff Coordination',
      description: 'Coordination of drivers, nurses, and emergency responders with scheduling and training support.',
      features: ['Staff scheduling', 'Training programs', 'Performance tracking', 'Certification support']
    },
    {
      icon: FileText,
      title: 'Reporting and Monitoring',
      description: 'Advanced analytics and reporting system for operational insights and quality improvement.',
      features: ['Real-time analytics', 'Performance metrics', 'Quality reports', 'Compliance tracking']
    }
  ]

  const processSteps = [
    {
      step: '1',
      title: 'Emergency Call',
      description: 'Receive emergency call through hotline, app, or online request with immediate triage assessment.',
      icon: Phone
    },
    {
      step: '2',
      title: 'Rapid Dispatch',
      description: 'Assign nearest available ambulance with appropriate medical team and equipment.',
      icon: Truck
    },
    {
      step: '3',
      title: 'On-Site Care',
      description: 'Provide professional medical care at the scene with stabilization and life support.',
      icon: Shield
    },
    {
      step: '4',
      title: 'Safe Transport',
      description: 'Transport patient to appropriate medical facility with continuous monitoring and care.',
      icon: MapPin
    }
  ]

  return (
    <div className={`${PUBLIC_HEADER_OFFSET} pb-12`}>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-red-50 to-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Our Emergency Services
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Comprehensive emergency medical services designed to save lives through rapid response, 
              professional care, and advanced medical technology.
            </p>
          </div>
        </div>
      </section>

      {/* Emergency Hotline */}
      <section className="py-12 bg-red-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-4 text-white">
              <Phone className="w-8 h-8" />
              <div>
                <p className="text-lg font-medium opacity-90">Emergency Hotline</p>
                <p className="text-3xl font-bold">999</p>
              </div>
            </div>
            <p className="text-red-100 mt-4">Available 24/7 for immediate emergency assistance</p>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">What We Offer</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Professional emergency medical services powered by our advanced dispatch system
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <div key={index} className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
                <div className="bg-red-100 rounded-2xl p-4 inline-block mb-6">
                  <service.icon className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  {service.title}
                </h3>
                <p className="text-gray-600 leading-relaxed mb-6">
                  {service.description}
                </p>
                <div className="space-y-2">
                  {service.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                      <span className="text-sm text-gray-600">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our streamlined emergency response process ensures rapid and effective medical care
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {processSteps.map((step, index) => (
              <div key={index} className="text-center">
                <div className="relative mb-6">
                  <div className="bg-red-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <step.icon className="w-8 h-8 text-red-600" />
                  </div>
                  <div className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                    {step.step}
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  {step.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Why Choose Our Services</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Advanced features and capabilities that set our emergency services apart
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <div className="flex items-center space-x-3 mb-4">
                <Clock className="w-6 h-6 text-red-600" />
                <h3 className="text-lg font-semibold text-gray-900">Rapid Response</h3>
              </div>
              <p className="text-gray-600">
                Average response time under 15 minutes in urban areas with optimized dispatch algorithms
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <div className="flex items-center space-x-3 mb-4">
                <Users className="w-6 h-6 text-red-600" />
                <h3 className="text-lg font-semibold text-gray-900">Expert Staff</h3>
              </div>
              <p className="text-gray-600">
                Highly trained paramedics and medical professionals with continuous education and certification
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <div className="flex items-center space-x-3 mb-4">
                <Truck className="w-6 h-6 text-red-600" />
                <h3 className="text-lg font-semibold text-gray-900">Modern Fleet</h3>
              </div>
              <p className="text-gray-600">
                State-of-the-art ambulances equipped with advanced medical equipment and GPS tracking
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <div className="flex items-center space-x-3 mb-4">
                <Activity className="w-6 h-6 text-red-600" />
                <h3 className="text-lg font-semibold text-gray-900">Real-Time Tracking</h3>
              </div>
              <p className="text-gray-600">
                Live tracking of ambulance locations and patient status for families and medical facilities
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <div className="flex items-center space-x-3 mb-4">
                <Shield className="w-6 h-6 text-red-600" />
                <h3 className="text-lg font-semibold text-gray-900">Quality Care</h3>
              </div>
              <p className="text-gray-600">
                Adherence to international medical standards with continuous quality improvement programs
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <div className="flex items-center space-x-3 mb-4">
                <AlertCircle className="w-6 h-6 text-red-600" />
                <h3 className="text-lg font-semibold text-gray-900">24/7 Availability</h3>
              </div>
              <p className="text-gray-600">
                Round-the-clock emergency services with dedicated dispatch centers and on-call staff
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-red-600 to-red-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Need Emergency Medical Services?
          </h2>
          <p className="text-xl text-red-100 mb-8 max-w-2xl mx-auto">
            Don't wait in critical situations. Our professional team is ready to provide 
            immediate medical assistance when you need it most.
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
