import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import type { CreateAppArgs, TemplateJsonTemplate } from 'create-solana-dapp'
import { createApp, runApp } from '../src/app.ts'
import { readPackageMetadata } from '../src/core/data-access/package-metadata.ts'
import { readPackageString } from '../src/core/util/read-package-string.ts'
import type { CreateCommandOptions, CreateSolanaDappApi } from '../src/create/create-feature-index.ts'
import { runCreate } from '../src/create/create-feature-index.ts'
import type {
  ApkInstallCommandOptions,
  ApkListCommandOptions,
  EmulatorCreateCommandOptions,
  EmulatorDeleteCommandOptions,
  EmulatorStartCommandOptions,
  EmulatorStatusCommandOptions,
  EmulatorStopCommandOptions,
} from '../src/emulator/emulator-feature-index.ts'

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
  description: string
  name: string
  version: string
}
const template: TemplateJsonTemplate = {
  description: 'A Solana Mobile template',
  id: 'gh:solana-mobile/templates/mobile/kit-expo-wallet',
  keywords: [],
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

  test('registers commands', () => {
    expect(createApp().commands.map((command) => command.name())).toEqual(['create', 'doctor', 'emulator'])
  })

  test('prints command help without arguments', async () => {
    const output: string[] = []
    const write = process.stdout.write
    let createCalled = false
    let doctorCalled = false

    process.stdout.write = ((chunk: string | Uint8Array) => {
      output.push(String(chunk))
      return true
    }) as typeof process.stdout.write

    try {
      await runApp(['node', 'solana-mobile'], {
        runCreate: async () => {
          createCalled = true
        },
        runDoctor: async () => {
          doctorCalled = true
          return 0
        },
      })
    } finally {
      process.stdout.write = write
    }

    expect(output.join('')).toContain('Commands:')
    expect(output.join('')).toContain('create')
    expect(output.join('')).toContain('doctor')
    expect(output.join('')).toContain('emulator')
    expect(createCalled).toBe(false)
    expect(doctorCalled).toBe(false)
  })

  test('registers emulator alias and subcommands', () => {
    const emulatorCommand = createApp().commands.find((command) => command.name() === 'emulator')

    expect(emulatorCommand?.aliases()).toEqual(['emu'])
    expect(emulatorCommand?.commands.map((command) => command.name())).toEqual([
      'apk',
      'create',
      'delete',
      'install',
      'list',
      'start',
      'status',
      'stop',
    ])
  })

  test('does not delegate emulator command to list', async () => {
    const emulatorListOptions: Array<Record<string, never>> = []
    const app = createApp({
      runEmulatorList: async (options) => {
        emulatorListOptions.push(options)
      },
    })

    app.configureOutput({
      writeErr: () => {},
      writeOut: () => {},
    })
    app.commands
      .find((command) => command.name() === 'emulator')
      ?.configureOutput({
        writeErr: () => {},
        writeOut: () => {},
      })

    await app.parseAsync(['node', 'solana-mobile', 'emulator'])

    expect(emulatorListOptions).toEqual([])
  })

  test('delegates emulator list command options', async () => {
    const emulatorListOptions: Array<Record<string, never>> = []
    const app = createApp({
      runEmulatorList: async (options) => {
        emulatorListOptions.push(options)
      },
    })

    await app.parseAsync(['node', 'solana-mobile', 'emulator', 'list'])

    expect(emulatorListOptions).toEqual([{}])
  })

  test('delegates emulator apk list command options', async () => {
    const emulatorApkListOptions: ApkListCommandOptions[] = []
    const app = createApp({
      runEmulatorApkList: async (options) => {
        emulatorApkListOptions.push(options)
      },
    })

    await app.parseAsync([
      'node',
      'solana-mobile',
      'emulator',
      'apk',
      'list',
      '--json',
      '--release-tag',
      '@solana-mobile/wallet-adapter-mobile@2.2.9',
    ])

    expect(emulatorApkListOptions).toEqual([
      {
        json: true,
        releaseTag: '@solana-mobile/wallet-adapter-mobile@2.2.9',
      },
    ])
  })

  test('delegates emulator alias list command options', async () => {
    const emulatorListOptions: Array<Record<string, never>> = []
    const app = createApp({
      runEmulatorList: async (options) => {
        emulatorListOptions.push(options)
      },
    })

    await app.parseAsync(['node', 'solana-mobile', 'emu', 'list'])

    expect(emulatorListOptions).toEqual([{}])
  })

  test('delegates emulator create command options', async () => {
    const emulatorCreateOptions: EmulatorCreateCommandOptions[] = []
    const app = createApp({
      runEmulatorCreate: async (options) => {
        emulatorCreateOptions.push(options)
      },
    })

    await app.parseAsync([
      'node',
      'solana-mobile',
      'emulator',
      'create',
      'test_phone',
      '--apk-version',
      '2.1.1',
      '--data-size',
      '16G',
      '--device',
      'pixel_9',
      '--install-apk',
      'fakewallet-v1-debug',
      '--profile',
      'solana-mobile',
      '--ram-mb',
      '4096',
      '--sdcard-size',
      '256M',
      '--sdk-root',
      '/sdk',
      '--start',
      '--system-image',
      'system-images;android-36;google_apis_playstore;arm64-v8a',
      '--vm-heap-mb',
      '384',
    ])

    expect(emulatorCreateOptions).toEqual([
      {
        apkVersion: '2.1.1',
        dataSize: '16G',
        device: 'pixel_9',
        installApk: ['fakewallet-v1-debug'],
        name: 'test_phone',
        profile: 'solana-mobile',
        ramMb: 4096,
        sdcardSize: '256M',
        sdkRoot: '/sdk',
        start: true,
        systemImage: 'system-images;android-36;google_apis_playstore;arm64-v8a',
        vmHeapMb: 384,
      },
    ])
  })

  test('delegates emulator delete command options', async () => {
    const emulatorDeleteOptions: EmulatorDeleteCommandOptions[] = []
    const app = createApp({
      runEmulatorDelete: async (options) => {
        emulatorDeleteOptions.push(options)
      },
    })

    await app.parseAsync(['node', 'solana-mobile', 'emulator', 'delete', 'Alpha', 'Beta', '--sdk-root', '/sdk'])

    expect(emulatorDeleteOptions).toEqual([{ names: ['Alpha', 'Beta'], sdkRoot: '/sdk' }])
  })

  test('delegates emulator delete without names', async () => {
    const emulatorDeleteOptions: EmulatorDeleteCommandOptions[] = []
    const app = createApp({
      runEmulatorDelete: async (options) => {
        emulatorDeleteOptions.push(options)
      },
    })

    await app.parseAsync(['node', 'solana-mobile', 'emulator', 'delete'])

    expect(emulatorDeleteOptions).toEqual([{ names: [] }])
  })

  test('delegates emulator install command options', async () => {
    const emulatorInstallOptions: ApkInstallCommandOptions[] = []
    const app = createApp({
      runEmulatorInstall: async (options) => {
        emulatorInstallOptions.push(options)
      },
    })

    await app.parseAsync([
      'node',
      'solana-mobile',
      'emulator',
      'install',
      'fakedapp-debug',
      'fakewallet-v1-debug',
      '--target',
      'local_phone',
      '--version',
      '2.1.1',
    ])

    expect(emulatorInstallOptions).toEqual([
      {
        apkIds: ['fakedapp-debug', 'fakewallet-v1-debug'],
        target: 'local_phone',
        version: '2.1.1',
      },
    ])
  })

  test('delegates emulator start command options', async () => {
    const emulatorStartOptions: EmulatorStartCommandOptions[] = []
    const app = createApp({
      runEmulatorStart: async (options) => {
        emulatorStartOptions.push(options)
      },
    })

    await app.parseAsync(['node', 'solana-mobile', 'emulator', 'start', 'Alpha', '--sdk-root', '/sdk'])

    expect(emulatorStartOptions).toEqual([{ name: 'Alpha', sdkRoot: '/sdk' }])
  })

  test('delegates emulator start without name', async () => {
    const emulatorStartOptions: EmulatorStartCommandOptions[] = []
    const app = createApp({
      runEmulatorStart: async (options) => {
        emulatorStartOptions.push(options)
      },
    })

    await app.parseAsync(['node', 'solana-mobile', 'emulator', 'start'])

    expect(emulatorStartOptions).toEqual([{ name: undefined }])
  })

  test('delegates emulator stop command options', async () => {
    const emulatorStopOptions: EmulatorStopCommandOptions[] = []
    const app = createApp({
      runEmulatorStop: async (options) => {
        emulatorStopOptions.push(options)
      },
    })

    await app.parseAsync(['node', 'solana-mobile', 'emulator', 'stop', 'Alpha'])

    expect(emulatorStopOptions).toEqual([{ nameOrSerial: 'Alpha' }])
  })

  test('delegates emulator status command options', async () => {
    const emulatorStatusOptions: EmulatorStatusCommandOptions[] = []
    const app = createApp({
      runEmulatorStatus: async (options) => {
        emulatorStatusOptions.push(options)
      },
    })

    await app.parseAsync(['node', 'solana-mobile', 'emulator', 'status', 'Alpha'])

    expect(emulatorStatusOptions).toEqual([{ nameOrSerial: 'Alpha' }])
  })

  test('delegates emulator status without name or serial', async () => {
    const emulatorStatusOptions: EmulatorStatusCommandOptions[] = []
    const app = createApp({
      runEmulatorStatus: async (options) => {
        emulatorStatusOptions.push(options)
      },
    })

    await app.parseAsync(['node', 'solana-mobile', 'emulator', 'status'])

    expect(emulatorStatusOptions).toEqual([{ nameOrSerial: undefined }])
  })

  test('delegates emulator stop without name or serial', async () => {
    const emulatorStopOptions: EmulatorStopCommandOptions[] = []
    const app = createApp({
      runEmulatorStop: async (options) => {
        emulatorStopOptions.push(options)
      },
    })

    await app.parseAsync(['node', 'solana-mobile', 'emulator', 'stop'])

    expect(emulatorStopOptions).toEqual([{ nameOrSerial: undefined }])
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

  test('creates with selected template using create-solana-dapp API', async () => {
    const createAppArgs: CreateAppArgs[] = []
    const createSolanaDapp = createMockCreateSolanaDapp({ createAppArgs })

    await runCreate(
      { projectName: 'my-app', skipInstall: true },
      {
        createSolanaDapp,
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
    const createAppArgs: CreateAppArgs[] = []
    const createSolanaDapp = createMockCreateSolanaDapp({ createAppArgs })
    let selectCalled = false

    await runCreate(
      { projectName: 'my-app', skipInstall: true, template: 'kit-expo-wallet' },
      {
        createSolanaDapp,
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
    const createAppArgs: CreateAppArgs[] = []
    const createSolanaDapp = createMockCreateSolanaDapp({ createAppArgs })
    let selectCalled = false

    try {
      await runCreate(
        {},
        {
          createSolanaDapp,
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

function createMockCreateSolanaDapp({ createAppArgs = [] }: { createAppArgs?: CreateAppArgs[] } = {}) {
  return {
    createApp: async (args) => {
      createAppArgs.push(args)
      return ['Install dependencies:']
    },
    detectInvokedPackageManager: () => 'bun',
    fetchTemplateData: async () => ({ items: [], templates: [template] }),
    finalNote: () => 'Done',
    getAppInfo: () => ({ name: 'create-solana-dapp', version: '4.8.5' }),
    listTemplateIds: ({ templates }) => templates.map((template) => template.id),
    listTemplates: () => {},
    listVersions: () => {},
    validateProjectName: (name) => (name ? undefined : 'Please enter at least 1 character'),
  } satisfies CreateSolanaDappApi
}
