import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { createApp } from '../src/app.ts'
import { readPackageMetadata } from '../src/core/data-access/package-metadata.ts'
import { readPackageString } from '../src/core/util/read-package-string.ts'

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
  description: string
  name: string
  version: string
}

describe('core', () => {
  test('reads package metadata', () => {
    expect(readPackageMetadata()).toEqual({
      description: packageJson.description,
      name: packageJson.name,
      version: packageJson.version,
    })
  })

  test('requires package metadata strings', () => {
    expect(() => readPackageString({ name: 123 }, 'name')).toThrow('package.json name must be a string')
  })
})

describe('app', () => {
  test('uses package metadata', () => {
    const app = createApp()

    expect(app.description()).toBe(packageJson.description)
    expect(app.name()).toBe(packageJson.name)
    expect(app.version()).toBe(packageJson.version)
  })

  test('registers doctor command', () => {
    expect(createApp().commands.map((command) => command.name())).toEqual(['doctor'])
  })
})
