export type MdmEntityKey =
  | 'regions'
  | 'districts'
  | 'incident-categories'
  | 'emergency-types'
  | 'priority-levels'
  | 'ambulance-types'
  | 'ambulance-statuses'
  | 'hospital-types'
  | 'mission-statuses'
  | 'cancellation-reasons'

export type MdmFieldType = 'text' | 'textarea' | 'number' | 'color' | 'select'

export interface MdmFieldDef {
  key: string
  label: string
  type?: MdmFieldType
  required?: boolean
  placeholder?: string
  optionsKey?: 'regions' | 'incident-categories'
}

export interface MdmEntityDef {
  key: MdmEntityKey
  label: string
  singular: string
  fields: MdmFieldDef[]
  tableColumns: { key: string; label: string; render?: 'status' | 'region' | 'category' | 'color' | 'sortOrder' }[]
}

export const MDM_ENTITIES: Record<MdmEntityKey, MdmEntityDef> = {
  regions: {
    key: 'regions',
    label: 'Regions',
    singular: 'Region',
    fields: [
      { key: 'code', label: 'Region Code', required: true },
      { key: 'name', label: 'Region Name', required: true },
      { key: 'description', label: 'Description', type: 'textarea' },
    ],
    tableColumns: [
      { key: 'code', label: 'Code' },
      { key: 'name', label: 'Name' },
      { key: 'description', label: 'Description' },
      { key: 'isActive', label: 'Status', render: 'status' },
    ],
  },
  districts: {
    key: 'districts',
    label: 'Districts',
    singular: 'District',
    fields: [
      { key: 'code', label: 'District Code', required: true },
      { key: 'name', label: 'District Name', required: true },
      { key: 'regionId', label: 'Region', type: 'select', required: true, optionsKey: 'regions' },
      { key: 'description', label: 'Description', type: 'textarea' },
    ],
    tableColumns: [
      { key: 'code', label: 'Code' },
      { key: 'name', label: 'Name' },
      { key: 'region', label: 'Region', render: 'region' },
      { key: 'isActive', label: 'Status', render: 'status' },
    ],
  },
  'incident-categories': {
    key: 'incident-categories',
    label: 'Incident Categories',
    singular: 'Incident Category',
    fields: [
      { key: 'code', label: 'Category Code', required: true },
      { key: 'name', label: 'Category Name', required: true },
      { key: 'description', label: 'Description', type: 'textarea' },
    ],
    tableColumns: [
      { key: 'code', label: 'Code' },
      { key: 'name', label: 'Name' },
      { key: 'description', label: 'Description' },
      { key: 'isActive', label: 'Status', render: 'status' },
    ],
  },
  'emergency-types': {
    key: 'emergency-types',
    label: 'Emergency Types',
    singular: 'Emergency Type',
    fields: [
      { key: 'code', label: 'Type Code', required: true },
      { key: 'name', label: 'Type Name', required: true },
      {
        key: 'incidentCategoryId',
        label: 'Related Category',
        type: 'select',
        optionsKey: 'incident-categories',
      },
      { key: 'description', label: 'Description', type: 'textarea' },
    ],
    tableColumns: [
      { key: 'code', label: 'Code' },
      { key: 'name', label: 'Name' },
      { key: 'incidentCategory', label: 'Category', render: 'category' },
      { key: 'isActive', label: 'Status', render: 'status' },
    ],
  },
  'priority-levels': {
    key: 'priority-levels',
    label: 'Priority Levels',
    singular: 'Priority Level',
    fields: [
      { key: 'code', label: 'Priority Code', required: true },
      { key: 'name', label: 'Priority Name', required: true },
      { key: 'color', label: 'Color', type: 'color' },
      { key: 'responseTargetMins', label: 'Response Target (mins)', type: 'number' },
      { key: 'description', label: 'Description', type: 'textarea' },
    ],
    tableColumns: [
      { key: 'code', label: 'Code' },
      { key: 'name', label: 'Name' },
      { key: 'color', label: 'Color', render: 'color' },
      { key: 'responseTargetMins', label: 'Target (min)' },
      { key: 'isActive', label: 'Status', render: 'status' },
    ],
  },
  'ambulance-types': {
    key: 'ambulance-types',
    label: 'Ambulance Types',
    singular: 'Ambulance Type',
    fields: [
      { key: 'code', label: 'Type Code', required: true },
      { key: 'name', label: 'Type Name', required: true },
      { key: 'description', label: 'Description', type: 'textarea' },
    ],
    tableColumns: [
      { key: 'code', label: 'Code' },
      { key: 'name', label: 'Name' },
      { key: 'isActive', label: 'Status', render: 'status' },
    ],
  },
  'ambulance-statuses': {
    key: 'ambulance-statuses',
    label: 'Ambulance Statuses',
    singular: 'Ambulance Status',
    fields: [
      { key: 'code', label: 'Status Code', required: true },
      { key: 'name', label: 'Status Name', required: true },
      { key: 'description', label: 'Description', type: 'textarea' },
    ],
    tableColumns: [
      { key: 'code', label: 'Code' },
      { key: 'name', label: 'Name' },
      { key: 'isActive', label: 'Status', render: 'status' },
    ],
  },
  'hospital-types': {
    key: 'hospital-types',
    label: 'Hospital Types',
    singular: 'Hospital Type',
    fields: [
      { key: 'code', label: 'Type Code', required: true },
      { key: 'name', label: 'Type Name', required: true },
      { key: 'description', label: 'Description', type: 'textarea' },
    ],
    tableColumns: [
      { key: 'code', label: 'Code' },
      { key: 'name', label: 'Name' },
      { key: 'isActive', label: 'Status', render: 'status' },
    ],
  },
  'mission-statuses': {
    key: 'mission-statuses',
    label: 'Mission Statuses',
    singular: 'Mission Status',
    fields: [
      { key: 'code', label: 'Status Code', required: true },
      { key: 'name', label: 'Status Name', required: true },
      { key: 'sortOrder', label: 'Sort Order', type: 'number' },
      { key: 'description', label: 'Description', type: 'textarea' },
    ],
    tableColumns: [
      { key: 'code', label: 'Code' },
      { key: 'name', label: 'Name' },
      { key: 'sortOrder', label: 'Order', render: 'sortOrder' },
      { key: 'isActive', label: 'Status', render: 'status' },
    ],
  },
  'cancellation-reasons': {
    key: 'cancellation-reasons',
    label: 'Cancellation Reasons',
    singular: 'Cancellation Reason',
    fields: [
      { key: 'code', label: 'Reason Code', required: true },
      { key: 'name', label: 'Reason Name', required: true },
      { key: 'description', label: 'Description', type: 'textarea' },
    ],
    tableColumns: [
      { key: 'code', label: 'Code' },
      { key: 'name', label: 'Name' },
      { key: 'isActive', label: 'Status', render: 'status' },
    ],
  },
}

export const MDM_SECTIONS = {
  locations: { title: 'Locations', tabs: ['regions', 'districts'] as MdmEntityKey[] },
  emergency: {
    title: 'Emergency Configuration',
    tabs: ['incident-categories', 'emergency-types', 'priority-levels'] as MdmEntityKey[],
  },
  ambulance: {
    title: 'Ambulance Configuration',
    tabs: ['ambulance-types', 'ambulance-statuses'] as MdmEntityKey[],
  },
  hospital: { title: 'Hospital Configuration', tabs: ['hospital-types'] as MdmEntityKey[] },
  mission: {
    title: 'Mission Configuration',
    tabs: ['mission-statuses', 'cancellation-reasons'] as MdmEntityKey[],
  },
} as const
