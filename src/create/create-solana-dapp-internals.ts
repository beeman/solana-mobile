import { readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'

export type CreateSolanaDappPackageManager = 'bun' | 'npm' | 'pnpm' | 'yarn'

export type CreateSolanaDappTemplate = {
  description: string
  displayName?: string
  id: string
  keywords?: string[]
  name: string
  path?: string
  usecase?: string
}

export type CreateSolanaDappMenuConfig = {
  description: string
  groups: string[]
  id: string
  keywords: string[]
  name: string
}[]

export type CreateSolanaDappArgs = {
  app: { name: string; version: string }
  dryRun: boolean
  name: string
  packageManager: CreateSolanaDappPackageManager
  skipGit: boolean
  skipInit: boolean
  skipInstall: boolean
  targetDirectory: string
  template: CreateSolanaDappTemplate
  verbose: boolean
}

export type CreateSolanaDappInternals = {
  createApp: (args: CreateSolanaDappArgs) => Promise<string[]>
  detectInvokedPackageManager: () => CreateSolanaDappPackageManager
  fetchTemplateData: (args: {
    config: CreateSolanaDappMenuConfig
    url: string
    verbose: boolean
  }) => Promise<{ templates: CreateSolanaDappTemplate[] }>
  finalNote: (args: CreateSolanaDappArgs & { instructions: string[]; target: string }) => string
  getAppInfo: () => { name: string; version: string }
  listTemplateIds: (args: { templates: CreateSolanaDappTemplate[] }) => string[]
  listTemplates: (args: { templates: CreateSolanaDappTemplate[] }) => void
  listVersions: () => void
  validateProjectName: (name: string) => string | undefined
}

const INTERNAL_EXPORTS = [
  'createApp',
  'detectInvokedPackageManager',
  'fetchTemplateData',
  'finalNote',
  'getAppInfo',
  'listTemplateIds',
  'listTemplates',
  'listVersions',
  'validateProjectName',
]

let internalsPromise: Promise<CreateSolanaDappInternals> | undefined

export function loadCreateSolanaDappInternals() {
  internalsPromise ??= loadInternals()
  return internalsPromise
}

async function loadInternals() {
  const require = createRequire(import.meta.url)
  const entryPath = require.resolve('create-solana-dapp')
  const distDirectory = dirname(entryPath)
  const sourcePath = join(distDirectory, 'index.mjs')
  const source = await readFile(sourcePath, 'utf8')
  const patchedSource = source.replace(/export \{ main \};\s*$/, `export { main, ${INTERNAL_EXPORTS.join(', ')} };\n`)

  if (patchedSource === source) {
    throw new Error('Could not load create-solana-dapp internals')
  }

  const patchedPath = join(distDirectory, 'solana-mobile-create-solana-dapp-internals.mjs')
  await writeFile(patchedPath, patchedSource)

  return import(pathToFileURL(patchedPath).href) as Promise<CreateSolanaDappInternals>
}
