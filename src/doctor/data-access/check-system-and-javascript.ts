import type { DoctorCheckResult } from './doctor-check-result.ts'
import type { DoctorEnvironment } from './doctor-environment.ts'
import { findExecutable, parseVersion } from './doctor-environment.ts'

const gigabyte = 1024 ** 3

export function checkOperatingSystem(environment: DoctorEnvironment): DoctorCheckResult {
  const names: Partial<Record<NodeJS.Platform, string>> = { darwin: 'macOS', linux: 'Linux', win32: 'Windows' }
  const platform = environment.getPlatform()
  const name = names[platform] ?? 'Unknown platform'
  const actual = `${name} ${environment.getRelease()} ${environment.architecture}`
  return {
    actual,
    category: 'system',
    message: `Detected ${actual}.`,
    name: 'Operating system',
    status: names[platform] ? 'pass' : 'info',
  }
}

export async function checkDiskSpace(environment: DoctorEnvironment, path = process.cwd()): Promise<DoctorCheckResult> {
  try {
    const bytes = await environment.getDiskSpace(path)
    const available = bytes / gigabyte
    const status = available < 10 ? 'fail' : available < 20 ? 'warn' : 'pass'
    return {
      actual: `${Math.floor(available)} GB available`,
      category: 'system',
      message: `Detected ${Math.floor(available)} GB of available disk space.`,
      name: 'Disk space',
      recommendation:
        status === 'pass'
          ? undefined
          : 'Free disk space for Android SDK packages, emulator images, Gradle caches, and project dependencies.',
      required: '10 GB minimum; 20 GB recommended',
      status,
    }
  } catch {
    return {
      actual: 'unknown',
      category: 'system',
      message: 'Unable to determine available disk space.',
      name: 'Disk space',
      status: 'info',
    }
  }
}

const packageManagers = [
  { command: 'bun', label: 'Bun' },
  { command: 'npm', label: 'npm' },
  { command: 'pnpm', label: 'pnpm' },
  { command: 'yarn', label: 'Yarn' },
] as const

export async function checkPackageManagers(environment: DoctorEnvironment): Promise<DoctorCheckResult> {
  const found = (
    await Promise.all(
      packageManagers.map(async ({ command, label }) => {
        const executable = await findExecutable(command, environment)
        if (!executable) return undefined
        try {
          const result = await environment.runCommand(executable, ['--version'])
          return { detail: `${label}: ${executable}`, value: `${label} ${parseVersion(result.stdout) ?? 'unknown'}` }
        } catch {
          return undefined
        }
      }),
    )
  ).filter((value): value is { detail: string; value: string } => Boolean(value))
  return {
    actual: found.length ? found.map(({ value }) => value).join(', ') : 'none found',
    category: 'javascript',
    details: found.map(({ detail }) => detail),
    message: found.length
      ? `Detected ${found.length} supported package manager(s).`
      : 'No supported package manager found.',
    name: 'Package managers',
    recommendation: found.length ? undefined : 'Install npm, pnpm, Yarn, or Bun.',
    required: 'at least one of npm, pnpm, Yarn, or Bun',
    status: found.length ? 'pass' : 'fail',
  }
}
