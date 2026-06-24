import { multiselect } from '@clack/prompts'
import type { AndroidApk } from '../data-access/apk-catalog.ts'
import { type MultiSelectPrompt, resolvePromptCancellation } from './emulator-ui-prompt-types.ts'

export async function selectApkIds(
  apks: readonly AndroidApk[],
  runMultiselect: MultiSelectPrompt = multiselect as MultiSelectPrompt,
): Promise<string[] | undefined> {
  if (apks.length === 0) {
    console.log('No installable APKs found.')
    return undefined
  }

  const selected = await runMultiselect({
    message: 'Select APKs to install',
    options: apks.map(({ assetName, id, releaseTag }) => ({
      hint: `${releaseTag} ${assetName}`,
      label: id,
      value: id,
    })),
    required: false,
  })

  if (typeof selected === 'symbol') {
    return resolvePromptCancellation(selected)
  }

  return selected
}
