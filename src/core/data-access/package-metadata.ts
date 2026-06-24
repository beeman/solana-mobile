import { readFileSync } from 'node:fs'
import { readPackageString } from '../util/read-package-string.ts'

export type PackageMetadata = {
  description: string
  name: string
  version: string
}

export function readPackageMetadata(): PackageMetadata {
  const packageJson = readPackageJson()

  return {
    description: readPackageString(packageJson, 'description'),
    name: readPackageString(packageJson, 'name'),
    version: readPackageString(packageJson, 'version'),
  }
}

function readPackageJson() {
  const packageJsonUrls = [
    new URL('../../../package.json', import.meta.url),
    new URL('../package.json', import.meta.url),
  ]

  for (const packageJsonUrl of packageJsonUrls) {
    try {
      return JSON.parse(readFileSync(packageJsonUrl, 'utf8')) as Partial<Record<keyof PackageMetadata, unknown>>
    } catch (error) {
      if (!isMissingFileError(error)) {
        throw error
      }
    }
  }

  throw new Error('Unable to find package.json')
}

function isMissingFileError(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT'
}
