import type { CommandRunner, RunningEmulator } from './emulator-types.ts'
import { listRunningEmulators } from './list-running-emulators.ts'
import { runExecutable } from './run-executable.ts'

export type Sleeper = (milliseconds: number) => Promise<void>

export interface WaitForBootedEmulatorDependencies {
  runCommand?: CommandRunner
  sleep?: Sleeper
}

export interface WaitForBootedEmulatorOptions {
  intervalMs?: number
  nameOrSerial: string
  timeoutMs?: number
}

export async function defaultSleep(milliseconds: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, milliseconds))
}

export async function waitForBootedEmulator(
  { intervalMs = 2_000, nameOrSerial, timeoutMs = 120_000 }: WaitForBootedEmulatorOptions,
  { runCommand = runExecutable, sleep = defaultSleep }: WaitForBootedEmulatorDependencies = {},
): Promise<RunningEmulator> {
  const attempts = Math.max(1, Math.ceil(timeoutMs / intervalMs))
  let lastError: Error | undefined

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const emulator = findRunningEmulator(await listRunningEmulators({ runCommand }), nameOrSerial)

      if (emulator && (await isBootCompleted(emulator.serial, runCommand))) {
        return emulator
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
    }

    if (attempt < attempts - 1) {
      await sleep(intervalMs)
    }
  }

  const reason = lastError ? ` Last error: ${lastError.message}` : ''

  throw new Error(`Timed out waiting for emulator to boot: ${nameOrSerial}.${reason}`)
}

async function isBootCompleted(serial: string, runCommand: CommandRunner): Promise<boolean> {
  const value = await runCommand(['adb', '-s', serial, 'shell', 'getprop', 'sys.boot_completed'])

  return value.trim() === '1'
}

function findRunningEmulator(
  runningEmulators: readonly RunningEmulator[],
  nameOrSerial: string,
): RunningEmulator | undefined {
  return runningEmulators.find(({ name, serial }) => name === nameOrSerial || serial === nameOrSerial)
}
