import type { Option } from '@clack/prompts'
import { cancel, isCancel, select } from '@clack/prompts'

export type CommandOption<TCommand extends string> = Option<TCommand>

export async function selectCommand<TCommand extends string>(options: CommandOption<TCommand>[]) {
  const command = await select<TCommand>({
    message: 'Select a command',
    options,
  })

  if (isCancel(command)) {
    cancel('Cancelled')
    return undefined
  }

  return command
}
