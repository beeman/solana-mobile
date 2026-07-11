import { join } from 'node:path'
import type { DoctorCheckResult } from './doctor-check-result.ts'
import { type DoctorEnvironment, defaultDoctorEnvironment, findExecutable } from './doctor-environment.ts'

const minimumAdbMajorVersion = 33

export async function checkAdbVersion(
  environment: DoctorEnvironment = defaultDoctorEnvironment,
  sdkRoot?: string,
): Promise<DoctorCheckResult> {
  const executable = await findExecutable('adb', environment, sdkRoot ? [join(sdkRoot, 'platform-tools')] : [])
  if (!executable) return missingAdb()
  try {
    const output = await environment.runCommand(executable, ['version'])
    const version = parseAdbVersion(`${output.stdout}\n${output.stderr}`)
    const passes = Boolean(version) && Number.parseInt(version ?? '', 10) >= minimumAdbMajorVersion
    return {
      actual: version ?? 'unknown',
      category: 'android-sdk',
      details: [`Executable: ${executable}`],
      message: version ? `Detected adb ${version}.` : 'Unable to detect adb platform-tools version.',
      name: 'adb',
      recommendation: passes ? undefined : 'Install or update Android SDK Platform Tools to version 33 or higher.',
      required: '33 or higher',
      status: passes ? 'pass' : 'fail',
    }
  } catch {
    return missingAdb()
  }
}

export function parseAdbVersion(output: string) {
  return output.match(/^Version\s+(\d+(?:\.\d+)*)/im)?.[1]
}

function missingAdb(): DoctorCheckResult {
  return {
    actual: 'not found',
    category: 'android-sdk',
    message: 'adb is not available.',
    name: 'adb',
    recommendation: 'Install Android SDK Platform Tools 33 or higher.',
    required: '33 or higher',
    status: 'fail',
  }
}
