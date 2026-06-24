import { Command, InvalidArgumentError } from 'commander'
import { readPackageMetadata } from './core/data-access/package-metadata.ts'
import { type CommandOption, selectCommand } from './core/ui/core-ui-select-command.ts'
import { type CreateCommandOptions, parsePackageManagerOption, runCreate } from './create/create-feature-index.ts'
import { runDoctor } from './doctor/doctor-feature-index.ts'
import {
  type ApkInstallCommandOptions,
  type ApkListCommandOptions,
  type EmulatorCreateCommandOptions,
  type EmulatorDeleteCommandOptions,
  type EmulatorListCommandOptions,
  type EmulatorStartCommandOptions,
  type EmulatorStatusCommandOptions,
  type EmulatorStopCommandOptions,
  runEmulatorApkList,
  runEmulatorCreate,
  runEmulatorDelete,
  runEmulatorInstall,
  runEmulatorList,
  runEmulatorStart,
  runEmulatorStatus,
  runEmulatorStop,
} from './emulator/emulator-feature-index.ts'

type AppCommand = 'create' | 'doctor'

const commandOptions: CommandOption<AppCommand>[] = [
  {
    hint: 'Create a new Solana Mobile project',
    label: 'create',
    value: 'create',
  },
  {
    hint: 'Check local development dependencies',
    label: 'doctor',
    value: 'doctor',
  },
]

export type AppOptions = {
  runEmulatorApkList?: (options: ApkListCommandOptions) => Promise<void>
  runEmulatorCreate?: (options: EmulatorCreateCommandOptions) => Promise<void>
  runEmulatorDelete?: (options: EmulatorDeleteCommandOptions) => Promise<void>
  runEmulatorInstall?: (options: ApkInstallCommandOptions) => Promise<void>
  runEmulatorList?: (options: EmulatorListCommandOptions) => Promise<void>
  runEmulatorStart?: (options: EmulatorStartCommandOptions) => Promise<void>
  runEmulatorStatus?: (options: EmulatorStatusCommandOptions) => Promise<void>
  runEmulatorStop?: (options: EmulatorStopCommandOptions) => Promise<void>
  runCreate?: (options: CreateCommandOptions) => Promise<void>
  runDoctor?: () => Promise<number>
}

export function createApp({
  runEmulatorApkList: runEmulatorApkListCommand = runEmulatorApkList,
  runEmulatorCreate: runEmulatorCreateCommand = runEmulatorCreate,
  runEmulatorDelete: runEmulatorDeleteCommand = runEmulatorDelete,
  runEmulatorInstall: runEmulatorInstallCommand = runEmulatorInstall,
  runEmulatorList: runEmulatorListCommand = runEmulatorList,
  runEmulatorStart: runEmulatorStartCommand = runEmulatorStart,
  runEmulatorStatus: runEmulatorStatusCommand = runEmulatorStatus,
  runEmulatorStop: runEmulatorStopCommand = runEmulatorStop,
  runCreate: runCreateCommand = runCreate,
  runDoctor: runDoctorCommand = runDoctor,
}: AppOptions = {}) {
  const metadata = readPackageMetadata()
  const app = new Command()

  app
    .enablePositionalOptions()
    .name(metadata.name)
    .description(metadata.description)
    .showHelpAfterError()
    .version(metadata.version)

  app
    .command('create [projectName]')
    .description('Create a new Solana Mobile project')
    .option('--pm, --package-manager <packageManager>', 'Package manager to use', parsePackageManagerOption)
    .option('-d, --dry-run', 'Dry run')
    .option('-t, --template <templateName>', 'Use a template')
    .option('--list-template-ids', 'List available template ids as JSON array')
    .option('--list-templates', 'List available templates')
    .option('--list-versions', 'Verify your versions of Anchor, AVM, Rust, and Solana')
    .option('--minimal', 'Use the minimal template')
    .option('--skip-git', 'Skip git initialization')
    .option('--skip-init', 'Skip running the init script')
    .option('--skip-install', 'Skip installing dependencies')
    .option('-v, --verbose', 'Verbose output')
    .action(async (projectName: string | undefined, options: CreateCommandOptions) => {
      await runCreateCommand({
        ...options,
        projectName,
        template: options.template ?? (options.minimal ? 'kit-expo-minimal' : undefined),
      })
    })

  app
    .command('doctor')
    .description('Check local development dependencies')
    .action(async () => {
      process.exitCode = await runDoctorCommand()
    })

  const emulatorCommand = app.command('emulator').alias('emu').description('Manage Android emulators')

  emulatorCommand.action(() => {
    emulatorCommand.outputHelp()
  })

  const emulatorApkCommand = emulatorCommand.command('apk').description('Manage installable emulator APKs')

  emulatorApkCommand.action(() => {
    emulatorApkCommand.outputHelp()
  })

  emulatorApkCommand
    .command('list')
    .description('List installable emulator APKs')
    .option('--json', 'Print APK list as JSON')
    .option('--release-tag <tag>', 'Mobile Wallet Adapter GitHub release tag')
    .option('--version <version>', 'Mobile Wallet Adapter release version')
    .action(async (options: ApkListCommandOptions) => {
      await runEmulatorApkListCommand(options)
    })

  emulatorCommand
    .command('create [name]')
    .description('Create or update an Android emulator')
    .option('--apk-release-tag <tag>', 'Mobile Wallet Adapter GitHub release tag for APK installs')
    .option('--apk-version <version>', 'Mobile Wallet Adapter release version for APK installs')
    .option('--data-size <size>', 'Data partition size')
    .option('--device <device>', 'Android device profile id')
    .option('--install-apk <id>', 'Install an APK id after starting the emulator', collectStringOption, [])
    .option('--profile <profile>', 'Solana Mobile emulator profile')
    .option('--ram-mb <megabytes>', 'RAM size in MB', parseIntegerOption)
    .option('--sdcard-size <size>', 'SD card size')
    .option('--sdk-root <path>', 'Android SDK root')
    .option('--start', 'Start the emulator after creating it')
    .option('--system-image <package>', 'Android system image package')
    .option('--vm-heap-mb <megabytes>', 'VM heap size in MB', parseIntegerOption)
    .action(async (name: string | undefined, options: Omit<EmulatorCreateCommandOptions, 'name'>) => {
      await runEmulatorCreateCommand({ ...options, name })
    })

  emulatorCommand
    .command('delete [names...]')
    .description('Delete Android emulators')
    .option('--sdk-root <path>', 'Android SDK root')
    .action(async (names: string[] | undefined, options: Omit<EmulatorDeleteCommandOptions, 'names'>) => {
      await runEmulatorDeleteCommand({ ...options, names: names ?? [] })
    })

  emulatorCommand
    .command('install [apkIds...]')
    .description('Install curated APKs on an Android emulator')
    .option('--release-tag <tag>', 'Mobile Wallet Adapter GitHub release tag')
    .option('--target <nameOrSerial>', 'Running emulator name or serial')
    .option('--version <version>', 'Mobile Wallet Adapter release version')
    .action(async (apkIds: string[] | undefined, options: Omit<ApkInstallCommandOptions, 'apkIds'>) => {
      await runEmulatorInstallCommand({ ...options, apkIds: apkIds ?? [] })
    })

  emulatorCommand
    .command('list')
    .description('List installed Android emulators')
    .action(async (options: EmulatorListCommandOptions) => {
      await runEmulatorListCommand(options)
    })

  emulatorCommand
    .command('start [name]')
    .description('Start an Android emulator')
    .option('--sdk-root <path>', 'Android SDK root')
    .action(async (name: string | undefined, options: Omit<EmulatorStartCommandOptions, 'name'>) => {
      await runEmulatorStartCommand({ ...options, name })
    })

  emulatorCommand
    .command('status [nameOrSerial]')
    .description('Show Android emulator status')
    .action(async (nameOrSerial: string | undefined) => {
      await runEmulatorStatusCommand({ nameOrSerial })
    })

  emulatorCommand
    .command('stop [nameOrSerial]')
    .description('Stop a running Android emulator')
    .action(async (nameOrSerial: string | undefined) => {
      await runEmulatorStopCommand({ nameOrSerial })
    })

  return app
}

function collectStringOption(value: string, previous: string[] = []) {
  return [...previous, value].sort((left, right) => left.localeCompare(right))
}

export async function runApp(argv = process.argv, options: AppOptions = {}) {
  if (argv.slice(2).length === 0) {
    const command = await selectCommand(commandOptions)

    if (!command) {
      process.exitCode = 1
      return
    }

    await runSelectedCommand(command, options)
    return
  }

  await createApp(options).parseAsync(argv)
}

async function runSelectedCommand(
  command: AppCommand,
  { runCreate: runCreateCommand = runCreate, runDoctor: runDoctorCommand = runDoctor }: AppOptions,
) {
  switch (command) {
    case 'create':
      await runCreateCommand({})
      return
    case 'doctor':
      process.exitCode = await runDoctorCommand()
      return
  }
}

function parseIntegerOption(value: string) {
  const parsed = Number(value)

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new InvalidArgumentError(`Expected a positive integer, received: ${value}`)
  }

  return parsed
}
