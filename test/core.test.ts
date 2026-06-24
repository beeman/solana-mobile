import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { createApp } from '../src/app.ts'
import { readPackageMetadata } from '../src/core/data-access/package-metadata.ts'
import { readPackageString } from '../src/core/util/read-package-string.ts'
import type { CreateCommandOptions } from '../src/create/create-feature-index.ts'
import { runCreate } from '../src/create/create-feature-index.ts'
import type {
  CreateSolanaDappArgs,
  CreateSolanaDappInternals,
  CreateSolanaDappTemplate,
} from '../src/create/create-solana-dapp-internals.ts'

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
  description: string
  name: string
  version: string
}
const template: CreateSolanaDappTemplate = {
  description: 'A Solana Mobile template',
  id: 'gh:solana-mobile/templates/mobile/kit-expo-wallet',
  name: 'kit-expo-wallet',
  path: 'mobile/kit-expo-wallet',
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
    expect(createApp().commands.map((command) => command.name())).toEqual(['create', 'doctor'])
  })

  test('registers create command options', () => {
    const createCommand = createApp().commands.find((command) => command.name() === 'create')

    expect(createCommand?.options.map((option) => option.flags)).toEqual([
      '--pm, --package-manager <packageManager>',
      '-d, --dry-run',
      '-t, --template <templateName>',
      '--list-template-ids',
      '--list-templates',
      '--list-versions',
      '--minimal',
      '--skip-git',
      '--skip-init',
      '--skip-install',
      '-v, --verbose',
    ])
  })

  test('delegates create command options', async () => {
    const createOptions: CreateCommandOptions[] = []
    const app = createApp({
      runCreate: async (options) => {
        createOptions.push(options)
      },
    })

    await app.parseAsync([
      'node',
      'solana-mobile',
      'create',
      'my-app',
      '--template',
      'mobile/kit-expo-wallet',
      '--pm',
      'pnpm',
      '--skip-git',
      '--skip-init',
      '--skip-install',
      '--verbose',
      '--dry-run',
    ])

    expect(createOptions).toEqual([
      {
        dryRun: true,
        packageManager: 'pnpm',
        projectName: 'my-app',
        skipGit: true,
        skipInit: true,
        skipInstall: true,
        template: 'mobile/kit-expo-wallet',
        verbose: true,
      },
    ])
  })

  test('creates with selected template using create-solana-dapp internals', async () => {
    const createAppArgs: CreateSolanaDappArgs[] = []
    const internals = createMockInternals({ createAppArgs })

    await runCreate(
      { projectName: 'my-app', skipInstall: true },
      {
        internals,
        selectTemplate: async () => template,
      },
    )

    expect(createAppArgs).toMatchObject([
      {
        dryRun: false,
        name: 'my-app',
        packageManager: 'bun',
        skipGit: false,
        skipInit: false,
        skipInstall: true,
        template,
        verbose: false,
      },
    ])
  })

  test('creates without selecting when template is provided', async () => {
    const createAppArgs: CreateSolanaDappArgs[] = []
    const internals = createMockInternals({ createAppArgs })
    let selectCalled = false

    await runCreate(
      { projectName: 'my-app', skipInstall: true, template: 'kit-expo-wallet' },
      {
        internals,
        selectTemplate: async () => {
          selectCalled = true
          return template
        },
      },
    )

    expect(createAppArgs).toMatchObject([{ template }])
    expect(selectCalled).toBe(false)
  })

  test('stops before selecting a template when project name is canceled', async () => {
    const previousExitCode = process.exitCode
    const createAppArgs: CreateSolanaDappArgs[] = []
    const internals = createMockInternals({ createAppArgs })
    let selectCalled = false

    try {
      await runCreate(
        {},
        {
          internals,
          promptProjectName: async () => undefined,
          selectTemplate: async () => {
            selectCalled = true
            return template
          },
        },
      )

      expect(createAppArgs).toEqual([])
      expect(process.exitCode).toBe(1)
      expect(selectCalled).toBe(false)
    } finally {
      process.exitCode = previousExitCode ?? 0
    }
  })
})

function createMockInternals({ createAppArgs = [] }: { createAppArgs?: CreateSolanaDappArgs[] } = {}) {
  return {
    createApp: async (args) => {
      createAppArgs.push(args)
      return ['Install dependencies:']
    },
    detectInvokedPackageManager: () => 'bun',
    fetchTemplateData: async () => ({ templates: [template] }),
    finalNote: () => 'Done',
    getAppInfo: () => ({ name: 'create-solana-dapp', version: '4.8.5' }),
    listTemplateIds: ({ templates }) => templates.map((template) => template.id),
    listTemplates: () => {},
    listVersions: () => {},
    validateProjectName: (name) => (name ? undefined : 'Please enter at least 1 character'),
  } satisfies CreateSolanaDappInternals
}
