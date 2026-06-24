export const DEFAULT_MOBILE_WALLET_ADAPTER_APK_VERSION = '2.1.1'

export const MOBILE_WALLET_ADAPTER_APK_IDS = [
  'fakedapp-debug',
  'fakedapp-release',
  'fakewallet-legacy-debug',
  'fakewallet-legacy-release',
  'fakewallet-v1-debug',
  'fakewallet-v1-release',
] as const

const MOBILE_WALLET_ADAPTER_REPOSITORY = 'solana-mobile/mobile-wallet-adapter'

export interface AndroidApk {
  assetName: string
  downloadUrl: string
  id: string
  releaseTag: string
}

export interface ApkCatalogOptions {
  releaseTag?: string
  version?: string
}

export interface GithubRelease {
  assets: GithubReleaseAsset[]
  tagName: string
}

export interface GithubReleaseAsset {
  downloadUrl: string
  name: string
}

export type MobileWalletAdapterReleaseFetcher = (tag: string) => Promise<GithubRelease | undefined>

export interface MobileWalletAdapterReleaseDependencies {
  fetchRelease?: MobileWalletAdapterReleaseFetcher
}

export async function defaultFetchMobileWalletAdapterRelease(tag: string): Promise<GithubRelease | undefined> {
  const response = await fetch(
    `https://api.github.com/repos/${MOBILE_WALLET_ADAPTER_REPOSITORY}/releases/tags/${encodeURIComponent(tag)}`,
    {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'solana-mobile-cli',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    },
  )

  if (response.status === 404) {
    return undefined
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch GitHub release ${tag}: ${response.status} ${response.statusText}`)
  }

  return parseGithubRelease(await response.json(), tag)
}

export async function listMobileWalletAdapterApks(
  options: ApkCatalogOptions = {},
  { fetchRelease = defaultFetchMobileWalletAdapterRelease }: MobileWalletAdapterReleaseDependencies = {},
): Promise<AndroidApk[]> {
  const release = await resolveMobileWalletAdapterRelease(options, { fetchRelease })
  const assetsByName = new Map(release.assets.map((asset) => [asset.name, asset]))

  return MOBILE_WALLET_ADAPTER_APK_IDS.flatMap((id) => {
    const assetName = `${id}.apk`
    const asset = assetsByName.get(assetName)

    if (!asset) {
      return []
    }

    return [
      {
        assetName,
        downloadUrl: asset.downloadUrl,
        id,
        releaseTag: release.tagName,
      },
    ]
  })
}

export function resolveMobileWalletAdapterApksById(
  availableApks: readonly AndroidApk[],
  apkIds: readonly string[],
): AndroidApk[] {
  const apksById = new Map(availableApks.map((apk) => [apk.id, apk]))
  const missingIds = [...new Set(apkIds)]
    .filter((id) => !apksById.has(id))
    .sort((left, right) => left.localeCompare(right))

  if (missingIds.length > 0) {
    const releaseTag = availableApks[0]?.releaseTag
    const releaseSuffix = releaseTag ? ` in release ${releaseTag}` : ''

    throw new Error(`APK ids are not available${releaseSuffix}: ${missingIds.join(', ')}`)
  }

  return [...new Set(apkIds)]
    .sort((left, right) => left.localeCompare(right))
    .map((id) => apksById.get(id) as AndroidApk)
}

export function resolveMobileWalletAdapterReleaseTagCandidates(options: ApkCatalogOptions = {}): string[] {
  if (options.releaseTag && options.version) {
    throw new Error('Use either releaseTag or version, not both.')
  }

  if (options.releaseTag) {
    return [options.releaseTag]
  }

  const version = normalizeMobileWalletAdapterVersion(options.version ?? DEFAULT_MOBILE_WALLET_ADAPTER_APK_VERSION)

  return [`v${version}`, `@solana-mobile/wallet-adapter-mobile@${version}`]
}

async function resolveMobileWalletAdapterRelease(
  options: ApkCatalogOptions,
  dependencies: Required<MobileWalletAdapterReleaseDependencies>,
): Promise<GithubRelease> {
  const candidates = resolveMobileWalletAdapterReleaseTagCandidates(options)

  for (const tag of candidates) {
    const release = await dependencies.fetchRelease(tag)

    if (release) {
      return release
    }
  }

  throw new Error(`Could not find Mobile Wallet Adapter release: ${candidates.join(', ')}`)
}

function normalizeMobileWalletAdapterVersion(version: string): string {
  const normalized = version.trim().replace(/^v/, '')

  if (!normalized) {
    throw new Error('APK version must not be empty.')
  }

  return normalized
}

function parseGithubRelease(value: unknown, fallbackTag: string): GithubRelease {
  if (!isRecord(value)) {
    throw new Error(`Invalid GitHub release response for ${fallbackTag}.`)
  }

  const assets = Array.isArray(value.assets) ? value.assets.flatMap(parseGithubReleaseAsset) : []
  const tagName = typeof value.tag_name === 'string' ? value.tag_name : fallbackTag

  return {
    assets: assets.sort((left, right) => left.name.localeCompare(right.name)),
    tagName,
  }
}

function parseGithubReleaseAsset(value: unknown): GithubReleaseAsset[] {
  if (!isRecord(value) || typeof value.browser_download_url !== 'string' || typeof value.name !== 'string') {
    return []
  }

  return [
    {
      downloadUrl: value.browser_download_url,
      name: value.name,
    },
  ]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
