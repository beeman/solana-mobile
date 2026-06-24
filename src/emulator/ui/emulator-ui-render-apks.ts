import type { AndroidApk } from '../data-access/apk-catalog.ts'

export function renderApks(apks: readonly AndroidApk[]) {
  if (apks.length === 0) {
    console.log('No installable APKs found.')
    return
  }

  console.table(
    apks.map(({ assetName, id, releaseTag }) => ({
      asset: assetName,
      id,
      release: releaseTag,
    })),
  )
}
