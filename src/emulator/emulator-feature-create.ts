import { homedir } from 'node:os'
import { resolveEmulatorProfile } from './data-access/avd-config.ts'
import { createAvd, defaultPathExists, defaultWriteTextFile } from './data-access/create-avd.ts'
import type {
  CreateAvdDependencies,
  EmulatorCreateCommandOptions,
  StartEmulatorDependencies,
} from './data-access/emulator-types.ts'
import { defaultReadDirectory, defaultReadTextFile } from './data-access/list-installed-avds.ts'
import { listRunningEmulators } from './data-access/list-running-emulators.ts'
import { runExecutable } from './data-access/run-executable.ts'
import { defaultStartProcess, startEmulator } from './data-access/start-emulator.ts'
import { type RunEmulatorInstallDependencies, runEmulatorInstall } from './emulator-feature-install.ts'
import { promptEmulatorName } from './ui/emulator-ui-prompt-emulator-name.ts'
import type { PromptDependencies } from './ui/emulator-ui-prompt-types.ts'

interface RunEmulatorCreateDependencies
  extends CreateAvdDependencies,
    PromptDependencies,
    RunEmulatorInstallDependencies,
    StartEmulatorDependencies {}

export async function runEmulatorCreate(
  options: EmulatorCreateCommandOptions = {},
  {
    createTemporaryDirectory,
    getHomeDirectory = homedir,
    fetchBinary,
    fetchRelease,
    pathExists = defaultPathExists(),
    readDirectory = defaultReadDirectory,
    readTextFile = defaultReadTextFile,
    removeDirectory,
    runCommand = runExecutable,
    runMultiselect,
    runSelect,
    runText,
    sleep,
    startProcess = defaultStartProcess,
    writeBinaryFile,
    writeTextFile = defaultWriteTextFile,
  }: RunEmulatorCreateDependencies = {},
) {
  const profile = resolveEmulatorProfile(options.profile)
  const name = options.name ?? (await promptEmulatorName(profile.name, runText))

  if (!name) {
    return
  }

  console.log(`Preparing emulator: ${name}`)

  const result = await createAvd(
    {
      ...options,
      name,
    },
    {
      getHomeDirectory,
      pathExists,
      readTextFile,
      runCommand,
      writeTextFile,
    },
  )

  const installApkIds = options.installApk ?? []

  if (!result.created) {
    console.log(`Emulator already exists: ${result.name}`)

    if (installApkIds.length === 0) {
      console.log(`To recreate, delete it first with: solana-mobile emulator delete ${result.name}`)
      return
    }
  } else {
    console.log(`Created emulator: ${result.name}`)
  }

  if (installApkIds.length > 0) {
    if (!(await isEmulatorRunning(result.name, runCommand))) {
      await startEmulator(
        { name: result.name, sdkRoot: result.sdkRoot },
        {
          getHomeDirectory,
          readDirectory,
          readTextFile,
          startProcess,
        },
      )
      console.log(`Started emulator: ${result.name}`)
    }

    await runEmulatorInstall(
      {
        apkIds: installApkIds,
        releaseTag: options.apkReleaseTag,
        target: result.name,
        version: options.apkVersion,
        waitForBoot: true,
      },
      {
        createTemporaryDirectory,
        fetchBinary,
        fetchRelease,
        removeDirectory,
        runCommand,
        runMultiselect,
        runSelect,
        sleep,
        writeBinaryFile,
      },
    )
    return
  }

  if (options.start) {
    await startEmulator(
      { name: result.name, sdkRoot: result.sdkRoot },
      {
        getHomeDirectory,
        readDirectory,
        readTextFile,
        startProcess,
      },
    )
    console.log(`Started emulator: ${result.name}`)
    return
  }

  console.log(`Start with: solana-mobile emulator start ${result.name}`)
}

async function isEmulatorRunning(name: string, runCommand: NonNullable<RunEmulatorCreateDependencies['runCommand']>) {
  return (await listRunningEmulators({ runCommand })).some((emulator) => emulator.name === name)
}
