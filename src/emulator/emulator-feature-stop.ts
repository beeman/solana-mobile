import type { EmulatorStopCommandOptions, StopEmulatorDependencies } from './data-access/emulator-types.ts'
import { listRunningEmulators } from './data-access/list-running-emulators.ts'
import { runExecutable } from './data-access/run-executable.ts'
import { stopEmulator } from './data-access/stop-emulator.ts'
import type { PromptDependencies } from './ui/emulator-ui-prompt-types.ts'
import { selectRunningEmulatorSerial } from './ui/emulator-ui-select-running-emulator-serial.ts'

interface RunEmulatorStopDependencies extends PromptDependencies, StopEmulatorDependencies {}

export async function runEmulatorStop(
  options: EmulatorStopCommandOptions = {},
  { runCommand = runExecutable, runSelect }: RunEmulatorStopDependencies = {},
) {
  const nameOrSerial =
    options.nameOrSerial ?? (await selectRunningEmulatorSerial(await listRunningEmulators({ runCommand }), runSelect))

  if (!nameOrSerial) {
    return
  }

  const stopped = await stopEmulator(nameOrSerial, { runCommand })

  console.log(`Stopped emulator: ${stopped.name} (${stopped.serial})`)
}
