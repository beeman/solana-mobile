import type { DoctorCheckResult } from './doctor-check-result.ts'

const minimumNodeMajorVersion = 22

export function checkNodeVersion(version = process.version): DoctorCheckResult {
  const normalizedVersion = normalizeNodeVersion(version)
  const majorVersion = normalizedVersion ? Number.parseInt(normalizedVersion, 10) : Number.NaN

  if (!normalizedVersion || Number.isNaN(majorVersion)) {
    return {
      actual: 'unknown',
      message: 'Unable to detect Node.js version.',
      name: 'node',
      ok: false,
      recommendation: 'Install Node.js 22 or higher.',
      required: '22 or higher',
    }
  }

  return {
    actual: normalizedVersion,
    message: `Detected Node.js ${normalizedVersion}.`,
    name: 'node',
    ok: majorVersion >= minimumNodeMajorVersion,
    recommendation: majorVersion >= minimumNodeMajorVersion ? undefined : 'Install Node.js 22 or higher.',
    required: '22 or higher',
  }
}

export function normalizeNodeVersion(version: string) {
  return version.trim().replace(/^v/i, '')
}
