import { Command } from 'commander'
import { readPackageMetadata } from './core/data-access/package-metadata.ts'
import { type CommandOption, selectCommand } from './core/ui/core-ui-select-command.ts'
import { type CreateCommandOptions, parsePackageManagerOption, runCreate } from './create/create-feature-index.ts'
import { runDoctor } from './doctor/doctor-feature-index.ts'

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
  runCreate?: (options: CreateCommandOptions) => Promise<void>
  runDoctor?: () => Promise<number>
}

export function createApp({
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

  return app
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
