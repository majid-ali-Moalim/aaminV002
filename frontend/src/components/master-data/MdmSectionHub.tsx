'use client'

import React, { useState } from 'react'
import { MDM_ENTITIES, MDM_SECTIONS, type MdmEntityKey } from '@/lib/master-data/config'
import MdmEntityPage from './MdmEntityPage'

interface MdmSectionHubProps {
  sectionKey: keyof typeof MDM_SECTIONS
  readOnly?: boolean
}

export default function MdmSectionHub({ sectionKey, readOnly }: MdmSectionHubProps) {
  const section = MDM_SECTIONS[sectionKey]
  const [tab, setTab] = useState<MdmEntityKey>(section.tabs[0])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
          {section.title}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Manage reference data — inactive records are hidden from operational modules
        </p>
      </div>

      {section.tabs.length > 1 && (
        <div className="flex flex-wrap gap-2 border-b border-gray-100 dark:border-gray-800 pb-1">
          {section.tabs.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-t-xl transition-colors ${
                tab === key
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              {MDM_ENTITIES[key].label}
            </button>
          ))}
        </div>
      )}

      <MdmEntityPage entityKey={tab} readOnly={readOnly} />
    </div>
  )
}
