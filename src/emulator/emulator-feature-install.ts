import {
  listMobileWalletAdapterApks,
  type MobileWalletAdapterReleaseDependencies,
  resolveMobileWalletAdapterApksById,
} from './data-access/apk-catalog.ts'
import type {
  ApkInstallCommandOptions,
  CommandRunner,
  ListRunningEmulatorsDependencies,
  RunningEmulator,
} from './data-access/emulator-types.ts'
import type { BinaryFetcher, InstallAndroidApksDependencies } from './data-access/install-apks.ts'
import { installAndroidApks } from './data-access/install-apks.ts'
import { listRunningEmulators } from './data-access/list-running-emulators.ts'
import { runExecutable } from './data-access/run-executable.ts'
import {
  type Sleeper,
  type WaitForBootedEmulatorDependencies,
  waitForBootedEmulator,
} from './data-access/wait-for-emulator.ts'
import type { PromptDependencies } from './ui/emulator-ui-prompt-types.ts'
import { selectApkIds } from './ui/emulator-ui-select-apk-ids.ts'
import { selectRunningEmulatorSerial } from './ui/emulator-ui-select-running-emulator-serial.ts'

export interface RunEmulatorInstallDependencies
  extends InstallAndroidApksDependencies,
    ListRunningEmulatorsDependencies,
    MobileWalletAdapterReleaseDependencies,
    PromptDependencies,
    WaitForBootedEmulatorDependencies {
  fetchBinary?: BinaryFetcher
  runCommand?: CommandRunner
  sleep?: Sleeper
}

export async function runEmulatorInstall(
  options: ApkInstallCommandOptions = {},
  {
    createTemporaryDirectory,
    fetchBinary,
    fetchRelease,
    removeDirectory,
    runCommand = runExecutable,
    runMultiselect,
    runSelect,
    sleep,
    writeBinaryFile,
  }: RunEmulatorInstallDependencies = {},
) {
  const availableApks = await listMobileWalletAdapterApks(options, { fetchRelease })
  const apkIds = options.apkIds?.length ? options.apkIds : await selectApkIds(availableApks, runMultiselect)

  if (!apkIds?.length) {
    return
  }

  const apks = resolveMobileWalletAdapterApksById(availableApks, apkIds)
  const serial = await resolveInstallTargetSerial(options, { runCommand, runSelect, sleep })

  if (!serial) {
    return
  }

  const installedApks = await installAndroidApks(
    {
      apks,
      serial,
    },
    {
      createTemporaryDirectory,
      fetchBinary,
      removeDirectory,
      runCommand,
      writeBinaryFile,
    },
  )

  for (const apk of installedApks) {
    console.log(`Installed APK: ${apk.id} (${apk.serial})`)
  }
}

async function resolveInstallTargetSerial(
  options: ApkInstallCommandOptions,
  {
    runCommand,
    runSelect,
    sleep,
  }: Pick<RunEmulatorInstallDependencies, 'runCommand' | 'runSelect' | 'sleep'> & { runCommand: CommandRunner },
): Promise<string | undefined> {
  if (options.target) {
    if (options.waitForBoot) {
      return (await waitForBootedEmulator({ nameOrSerial: options.target }, { runCommand, sleep })).serial
    }

    return resolveRunningEmulatorSerial(options.target, await listRunningEmulators({ runCommand }))
  }

  const selectedSerial = await selectRunningEmulatorSerial(
    await listRunningEmulators({ runCommand }),
    'Select a running emulator to install APKs on',
    runSelect,
  )

  if (!selectedSerial) {
    return undefined
  }

  if (options.waitForBoot) {
    return (await waitForBootedEmulator({ nameOrSerial: selectedSerial }, { runCommand, sleep })).serial
  }

  return selectedSerial
}

function resolveRunningEmulatorSerial(nameOrSerial: string, runningEmulators: readonly RunningEmulator[]): string {
  const matchingEmulators = runningEmulators.filter(
    ({ name, serial }) => name === nameOrSerial || serial === nameOrSerial,
  )

  if (matchingEmulators.length === 0) {
    throw new Error(`Unknown running emulator: ${nameOrSerial}`)
  }

  if (matchingEmulators.length > 1) {
    throw new Error(`Multiple running emulators match ${nameOrSerial}. Select by serial instead.`)
  }

  return (matchingEmulators[0] as RunningEmulator).serial
}
