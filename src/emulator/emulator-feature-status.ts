import type { EmulatorStatusCommandOptions } from './data-access/emulator-types.ts'
import { listEmulatorStatuses } from './data-access/list-emulator-statuses.ts'
import { renderEmulatorStatuses } from './ui/emulator-ui-render-emulator-statuses.ts'

export async function runEmulatorStatus(options: EmulatorStatusCommandOptions = {}) {
  const statuses = await listEmulatorStatuses()
  const visibleStatuses = options.nameOrSerial
    ? statuses.filter((status) => status.name === options.nameOrSerial || status.serial === options.nameOrSerial)
    : statuses

  if (options.nameOrSerial && visibleStatuses.length === 0) {
    console.error(`Unknown emulator: ${options.nameOrSerial}`)
    process.exitCode = 2
    return
  }

  renderEmulatorStatuses(visibleStatuses)

  if (options.nameOrSerial) {
    process.exitCode = visibleStatuses.some((status) => status.state === 'online' && status.booted === 'yes') ? 0 : 1
  }
}
