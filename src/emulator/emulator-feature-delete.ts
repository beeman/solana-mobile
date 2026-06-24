import { homedir } from 'node:os'
import { deleteInstalledAvds } from './data-access/delete-installed-avds.ts'
import type {
  DeleteInstalledAvdsDependencies,
  EmulatorDeleteCommandOptions,
  ListInstalledAvdsDependencies,
} from './data-access/emulator-types.ts'
import { defaultReadDirectory, defaultReadTextFile, listInstalledAvds } from './data-access/list-installed-avds.ts'
import { runExecutable } from './data-access/run-executable.ts'
import type { PromptDependencies } from './ui/emulator-ui-prompt-types.ts'
import { selectInstalledEmulatorNames } from './ui/emulator-ui-select-installed-emulator-names.ts'

interface RunEmulatorDeleteDependencies
  extends DeleteInstalledAvdsDependencies,
    ListInstalledAvdsDependencies,
    PromptDependencies {}

export async function runEmulatorDelete(
  options: EmulatorDeleteCommandOptions,
  {
    getHomeDirectory = homedir,
    readDirectory = defaultReadDirectory,
    readTextFile = defaultReadTextFile,
    runCommand = runExecutable,
    runMultiselect,
  }: RunEmulatorDeleteDependencies = {},
) {
  const names =
    options.names && options.names.length > 0
      ? options.names
      : await selectInstalledEmulatorNames(
          await listInstalledAvds({ getHomeDirectory, readDirectory, readTextFile }),
          runMultiselect,
        )

  if (!names || names.length === 0) {
    return
  }

  await deleteInstalledAvds(names, options.sdkRoot, { runCommand })

  for (const name of names) {
    console.log(`Deleted emulator: ${name}`)
  }
}
