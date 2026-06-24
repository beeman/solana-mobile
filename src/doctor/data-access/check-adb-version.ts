import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type { DoctorCheckResult } from './doctor-check-result.ts'

const execFileAsync = promisify(execFile)
const minimumAdbMajorVersion = 33

type CommandRunner = (command: string, args: string[]) => Promise<string>

export async function checkAdbVersion(runCommand: CommandRunner = runExecutable): Promise<DoctorCheckResult> {
  try {
    const output = await runCommand('adb', ['version'])
    const version = parseAdbVersion(output)
    const majorVersion = version ? Number.parseInt(version, 10) : Number.NaN

    if (!version || Number.isNaN(majorVersion)) {
      return {
        actual: 'unknown',
        message: 'Unable to detect adb platform-tools version.',
        name: 'adb',
        ok: false,
        recommendation: 'Install Android SDK Platform Tools 33 or higher.',
        required: '33 or higher',
      }
    }

    return {
      actual: version,
      message: `Detected adb ${version}.`,
      name: 'adb',
      ok: majorVersion >= minimumAdbMajorVersion,
      recommendation:
        majorVersion >= minimumAdbMajorVersion
          ? undefined
          : 'Update Android SDK Platform Tools to version 33 or higher.',
      required: '33 or higher',
    }
  } catch {
    return {
      actual: 'not found',
      message: 'adb is not available on PATH.',
      name: 'adb',
      ok: false,
      recommendation: 'Install Android SDK Platform Tools 33 or higher and make sure adb is on PATH.',
      required: '33 or higher',
    }
  }
}

export function parseAdbVersion(output: string) {
  return output.match(/^Version\s+(\d+(?:\.\d+)*)/im)?.[1]
}

async function runExecutable(command: string, args: string[]) {
  const { stdout } = await execFileAsync(command, args)
  return stdout
}
