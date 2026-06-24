import packageJson from '../../../package.json' with { type: 'json' }
import { readPackageString } from '../util/read-package-string.ts'

export type PackageMetadata = {
  description: string
  name: string
  version: string
}

export function readPackageMetadata(): PackageMetadata {
  return {
    description: readPackageString(packageJson, 'description'),
    name: readPackageString(packageJson, 'name'),
    version: readPackageString(packageJson, 'version'),
  }
}
