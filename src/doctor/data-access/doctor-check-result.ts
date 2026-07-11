export type DoctorCheckStatus = 'fail' | 'info' | 'pass' | 'warn'

export type DoctorCheckCategory = 'android-sdk' | 'device' | 'emulator' | 'java' | 'javascript' | 'system'

export type DoctorCheckResult = {
  actual: string
  category: DoctorCheckCategory
  details?: string[]
  message: string
  name: string
  recommendation?: string
  required?: string
  status: DoctorCheckStatus
}

export type DoctorCapabilities = {
  androidBuild: boolean
  emulator: boolean
  physicalDevice: boolean
  projectCreation: boolean
}

export type DoctorReport = {
  capabilities: DoctorCapabilities
  checks: DoctorCheckResult[]
  ready: boolean
  recommendations: string[]
}
