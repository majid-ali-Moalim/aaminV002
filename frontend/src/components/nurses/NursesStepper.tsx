import React from 'react'
import { Check } from 'lucide-react'

interface Step {
  id: number
  title: string
  description: string
}

interface NursesStepperProps {
  steps: Step[]
  currentStep: number
}

export default function NursesStepper({ steps, currentStep }: NursesStepperProps) {
  return (
    <div className="relative">
      <div className="flex items-center justify-between w-full max-w-5xl mx-auto px-4">
        {steps.map((step, index) => {
          const isActive = currentStep === step.id
          const isCompleted = currentStep > step.id

          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center relative z-10">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500 border-2 font-black text-xs
                    ${
                      isActive
                        ? 'bg-red-600 border-red-600 text-white shadow-xl shadow-red-200 ring-4 ring-red-50 scale-110'
                        : isCompleted
                          ? 'bg-red-600 border-red-600 text-white'
                          : 'bg-white border-gray-100 text-gray-300'
                    }`}
                >
                  {isCompleted ? <Check className="w-5 h-5 stroke-[4]" /> : step.id}
                </div>

                <div className="mt-3 text-center">
                  <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${isActive ? 'text-red-600' : 'text-gray-400'}`}>
                    {step.title}
                  </p>
                  <p className="text-[9px] text-gray-300 font-bold whitespace-nowrap hidden sm:block mt-0.5">
                    {step.description}
                  </p>
                </div>
              </div>

              {index < steps.length - 1 && (
                <div className="flex-1 mx-4 h-[2px] bg-gray-50 relative -mt-12">
                  <div
                    className="absolute top-0 left-0 h-full bg-red-600 transition-all duration-700 ease-in-out shadow-[0_0_10px_rgba(198,40,40,0.3)]"
                    style={{ width: isCompleted ? '100%' : '0%' }}
                  />
                </div>
              )}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}
