import type { EmulatorListCommandOptions } from './data-access/emulator-types.ts'
import { listInstalledAvds } from './data-access/list-installed-avds.ts'
import { renderInstalledEmulators } from './ui/emulator-ui-render-installed-emulators.ts'

export async function runEmulatorList(_options: EmulatorListCommandOptions = {}) {
  renderInstalledEmulators(await listInstalledAvds())
}
