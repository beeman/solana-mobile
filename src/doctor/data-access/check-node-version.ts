import type { DoctorCheckResult } from './doctor-check-result.ts'

export const minimumNodeMajorVersion = 22

export function checkNodeVersion(version = process.version): DoctorCheckResult {
  const normalizedVersion = normalizeNodeVersion(version)
  const majorVersion = Number.parseInt(normalizedVersion, 10)
  const passes = Boolean(normalizedVersion) && !Number.isNaN(majorVersion) && majorVersion >= minimumNodeMajorVersion
  return {
    actual: normalizedVersion || 'unknown',
    category: 'javascript',
    message: passes ? `Detected Node.js ${normalizedVersion}.` : 'Node.js 22 or higher is required.',
    name: 'Node.js',
    recommendation: passes ? undefined : 'Install Node.js 22 or higher.',
    required: '22 or higher',
    status: passes ? 'pass' : 'fail',
  }
}

export function normalizeNodeVersion(version: string) {
  return version.trim().replace(/^v/i, '')
}
