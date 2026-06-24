import type { InstalledAvd } from '../data-access/emulator-types.ts'

export function renderInstalledEmulators(avds: readonly InstalledAvd[]) {
  if (avds.length === 0) {
    console.log('No Android emulators found.')
    return
  }

  console.table(
    avds.map(({ device, name, target }) => ({
      device: device ?? '',
      name,
      target: target ?? '',
    })),
    ['device', 'name', 'target'],
  )
}
