import { listMobileWalletAdapterApks, type MobileWalletAdapterReleaseDependencies } from './data-access/apk-catalog.ts'
import type { ApkListCommandOptions } from './data-access/emulator-types.ts'
import { renderApks } from './ui/emulator-ui-render-apks.ts'

export async function runEmulatorApkList(
  options: ApkListCommandOptions = {},
  dependencies: MobileWalletAdapterReleaseDependencies = {},
) {
  const apks = await listMobileWalletAdapterApks(options, dependencies)

  if (options.json) {
    console.log(JSON.stringify(apks, null, 2))
    return
  }

  renderApks(apks)
}
