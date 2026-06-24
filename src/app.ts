import { Command } from 'commander'
import { readPackageMetadata } from './core/data-access/package-metadata.ts'
import { type CommandOption, selectCommand } from './core/ui/core-ui-select-command.ts'
import { runDoctor } from './doctor/doctor-feature-index.ts'

type AppCommand = 'doctor'

const commandOptions: CommandOption<AppCommand>[] = [
  {
    hint: 'Check local development dependencies',
    label: 'doctor',
    value: 'doctor',
  },
]

export type AppOptions = {
  runDoctor?: () => Promise<number>
}

export function createApp({ runDoctor: runDoctorCommand = runDoctor }: AppOptions = {}) {
  const metadata = readPackageMetadata()
  const app = new Command()

  app.name(metadata.name).description(metadata.description).showHelpAfterError().version(metadata.version)

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

async function runSelectedCommand(command: AppCommand, { runDoctor: runDoctorCommand = runDoctor }: AppOptions) {
  switch (command) {
    case 'doctor':
      process.exitCode = await runDoctorCommand()
      return
  }
}
