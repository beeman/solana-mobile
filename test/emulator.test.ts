import { describe, expect, test } from 'bun:test'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parseAvdConfig } from '../src/emulator/data-access/avd-config.ts'
import { createAvd } from '../src/emulator/data-access/create-avd.ts'
import { deleteInstalledAvds } from '../src/emulator/data-access/delete-installed-avds.ts'
import { listEmulatorStatuses } from '../src/emulator/data-access/list-emulator-statuses.ts'
import { listInstalledAvds } from '../src/emulator/data-access/list-installed-avds.ts'
import { listRunningEmulators } from '../src/emulator/data-access/list-running-emulators.ts'
import { resolveAndroidSdkRoot } from '../src/emulator/data-access/resolve-android-sdk-root.ts'
import { startEmulator } from '../src/emulator/data-access/start-emulator.ts'
import { stopEmulator } from '../src/emulator/data-access/stop-emulator.ts'
import { runEmulatorCreate } from '../src/emulator/emulator-feature-create.ts'
import { runEmulatorDelete } from '../src/emulator/emulator-feature-delete.ts'
import { runEmulatorStart } from '../src/emulator/emulator-feature-start.ts'
import { runEmulatorStop } from '../src/emulator/emulator-feature-stop.ts'

async function createTemporaryDirectory(prefix: string): Promise<string> {
  return mkdtemp(join(tmpdir(), prefix))
}

describe('emulator', () => {
  test('lists registered AVDs with config metadata sorted by name', async () => {
    const homeDirectory = await createTemporaryDirectory('solana-mobile-avd-list-')
    const avdRootDirectory = join(homeDirectory, '.android', 'avd')

    try {
      await mkdir(join(avdRootDirectory, 'Beta.avd'), { recursive: true })
      await mkdir(join(avdRootDirectory, 'Alpha.avd'), { recursive: true })
      await mkdir(join(avdRootDirectory, 'Ghost.avd'), { recursive: true })
      await writeFile(join(avdRootDirectory, 'Beta.ini'), 'path=Beta.avd\n')
      await writeFile(join(avdRootDirectory, 'Alpha.ini'), 'path=Alpha.avd\n')
      await writeFile(join(avdRootDirectory, 'Beta.avd', 'config.ini'), 'hw.device.name=pixel_9\ntarget=android-36\n')
      await writeFile(join(avdRootDirectory, 'Alpha.avd', 'config.ini'), 'target=android-35\n')

      expect(await listInstalledAvds({ getHomeDirectory: () => homeDirectory })).toEqual([
        {
          device: undefined,
          name: 'Alpha',
          target: 'android-35',
        },
        {
          device: 'pixel_9',
          name: 'Beta',
          target: 'android-36',
        },
      ])
    } finally {
      await rm(homeDirectory, { force: true, recursive: true })
    }
  })

  test('parses AVD config key-value pairs', () => {
    expect(parseAvdConfig('target=android-36\nignored\nhw.device.name=pixel_9\n')).toEqual({
      'hw.device.name': 'pixel_9',
      target: 'android-36',
    })
  })

  test('resolves Android SDK root from environment and home directory', () => {
    expect(resolveAndroidSdkRoot({ ANDROID_HOME: '/home-sdk', ANDROID_SDK_ROOT: '/root-sdk' }, '/Users/test')).toBe(
      '/root-sdk',
    )
    expect(resolveAndroidSdkRoot({ ANDROID_HOME: '/home-sdk' }, '/Users/test')).toBe('/home-sdk')
    expect(resolveAndroidSdkRoot({}, '/Users/test')).toBe('/Users/test/Library/Android/sdk')
  })

  test('creates an emulator and writes the expected config shape', async () => {
    const rootDirectory = await createTemporaryDirectory('solana-mobile-avd-create-')
    const homeDirectory = join(rootDirectory, 'home')
    const sdkRoot = join(rootDirectory, 'sdk')
    const systemImage = 'system-images;android-36;google_apis_playstore;arm64-v8a'
    const commands: Array<{ cmd: [string, ...string[]]; stdin?: string }> = []

    try {
      const result = await createAvd(
        {
          device: 'pixel_9',
          name: 'test_phone',
          sdkRoot,
          systemImage,
        },
        {
          getHomeDirectory: () => homeDirectory,
          runCommand: async (cmd, options = {}) => {
            commands.push({ cmd, stdin: options.stdin })

            if (cmd[0].endsWith('sdkmanager')) {
              await mkdir(join(sdkRoot, ...systemImage.split(';')), { recursive: true })
              await writeFile(join(sdkRoot, ...systemImage.split(';'), 'source.properties'), '')
            }

            if (cmd[0].endsWith('avdmanager')) {
              await mkdir(join(homeDirectory, '.android', 'avd', 'test_phone.avd'), { recursive: true })
              await writeFile(join(homeDirectory, '.android', 'avd', 'test_phone.ini'), 'path=test_phone.avd\n')
              await writeFile(join(homeDirectory, '.android', 'avd', 'test_phone.avd', 'config.ini'), 'legacy=1\n')
            }

            return ''
          },
        },
      )
      const config = parseAvdConfig(
        await readFile(join(homeDirectory, '.android', 'avd', 'test_phone.avd', 'config.ini'), 'utf8'),
      )

      expect(commands).toEqual([
        {
          cmd: [join(sdkRoot, 'cmdline-tools', 'latest', 'bin', 'sdkmanager'), '--install', systemImage],
          stdin: undefined,
        },
        {
          cmd: [
            join(sdkRoot, 'cmdline-tools', 'latest', 'bin', 'avdmanager'),
            'create',
            'avd',
            '--abi',
            'arm64-v8a',
            '--device',
            'pixel_9',
            '--force',
            '--name',
            'test_phone',
            '--package',
            systemImage,
            '--sdcard',
            '512M',
          ],
          stdin: 'no\n',
        },
      ])
      expect(config).toMatchObject({
        'abi.type': 'arm64-v8a',
        'avd.ini.displayname': 'test phone',
        'disk.dataPartition.size': '32G',
        'hw.device.name': 'pixel_9',
        'hw.ramSize': '8192',
        'image.sysdir.1': 'system-images/android-36/google_apis_playstore/arm64-v8a/',
        legacy: '1',
        'sdcard.size': '512M',
        target: 'android-36',
      })
      expect(result).toEqual({
        created: true,
        emulatorPath: join(sdkRoot, 'emulator', 'emulator'),
        name: 'test_phone',
        sdkRoot,
        systemImage,
      })
    } finally {
      await rm(rootDirectory, { force: true, recursive: true })
    }
  })

  test('skips creating when the emulator already exists', async () => {
    const rootDirectory = await createTemporaryDirectory('solana-mobile-avd-create-existing-')
    const homeDirectory = join(rootDirectory, 'home')
    const sdkRoot = join(rootDirectory, 'sdk')
    const systemImage = 'system-images;android-36;google_apis_playstore;arm64-v8a'
    const configPath = join(homeDirectory, '.android', 'avd', 'existing_phone.avd', 'config.ini')
    const commands: Array<{ cmd: [string, ...string[]]; stdin?: string }> = []

    try {
      await mkdir(join(homeDirectory, '.android', 'avd', 'existing_phone.avd'), { recursive: true })
      await writeFile(configPath, 'legacy=1\n')

      const result = await createAvd(
        {
          device: 'pixel_9',
          name: 'existing_phone',
          sdkRoot,
          systemImage,
        },
        {
          getHomeDirectory: () => homeDirectory,
          runCommand: async (cmd, options = {}) => {
            commands.push({ cmd, stdin: options.stdin })
            return ''
          },
        },
      )

      expect(commands).toEqual([])
      expect(await readFile(configPath, 'utf8')).toBe('legacy=1\n')
      expect(result).toEqual({
        created: false,
        emulatorPath: join(sdkRoot, 'emulator', 'emulator'),
        name: 'existing_phone',
        sdkRoot,
        systemImage,
      })
    } finally {
      await rm(rootDirectory, { force: true, recursive: true })
    }
  })

  test('prompts for emulator name before creating when name is omitted', async () => {
    const rootDirectory = await createTemporaryDirectory('solana-mobile-avd-create-prompt-')
    const homeDirectory = join(rootDirectory, 'home')
    const sdkRoot = join(rootDirectory, 'sdk')
    const systemImage = 'system-images;android-36;google_apis_playstore;arm64-v8a'
    const commands: Array<{ cmd: [string, ...string[]]; stdin?: string }> = []

    try {
      await runEmulatorCreate(
        {
          sdkRoot,
          systemImage,
        },
        {
          getHomeDirectory: () => homeDirectory,
          runCommand: async (cmd, options = {}) => {
            commands.push({ cmd, stdin: options.stdin })

            if (cmd[0].endsWith('sdkmanager')) {
              await mkdir(join(sdkRoot, ...systemImage.split(';')), { recursive: true })
              await writeFile(join(sdkRoot, ...systemImage.split(';'), 'source.properties'), '')
            }

            if (cmd[0].endsWith('avdmanager')) {
              await mkdir(join(homeDirectory, '.android', 'avd', 'prompted_phone.avd'), { recursive: true })
              await writeFile(join(homeDirectory, '.android', 'avd', 'prompted_phone.ini'), 'path=prompted_phone.avd\n')
            }

            return ''
          },
          runText: async (options) => {
            expect(options.defaultValue).toBe('solana-mobile')
            expect(options.initialValue).toBe('solana-mobile')
            expect(options.message).toBe('Emulator name')
            return 'prompted_phone'
          },
        },
      )

      expect(commands).toEqual([
        {
          cmd: [join(sdkRoot, 'cmdline-tools', 'latest', 'bin', 'sdkmanager'), '--install', systemImage],
          stdin: undefined,
        },
        {
          cmd: [
            join(sdkRoot, 'cmdline-tools', 'latest', 'bin', 'avdmanager'),
            'create',
            'avd',
            '--abi',
            'arm64-v8a',
            '--device',
            'pixel_9_pro_xl',
            '--force',
            '--name',
            'prompted_phone',
            '--package',
            systemImage,
            '--sdcard',
            '512M',
          ],
          stdin: 'no\n',
        },
      ])
    } finally {
      await rm(rootDirectory, { force: true, recursive: true })
    }
  })

  test('creates without prompting when emulator name is provided', async () => {
    const rootDirectory = await createTemporaryDirectory('solana-mobile-avd-create-named-')
    const homeDirectory = join(rootDirectory, 'home')
    const sdkRoot = join(rootDirectory, 'sdk')
    const systemImage = 'system-images;android-36;google_apis_playstore;arm64-v8a'
    const commands: Array<[string, ...string[]]> = []

    try {
      await runEmulatorCreate(
        {
          name: 'named_phone',
          sdkRoot,
          systemImage,
        },
        {
          getHomeDirectory: () => homeDirectory,
          runCommand: async (cmd) => {
            commands.push(cmd)

            if (cmd[0].endsWith('sdkmanager')) {
              await mkdir(join(sdkRoot, ...systemImage.split(';')), { recursive: true })
              await writeFile(join(sdkRoot, ...systemImage.split(';'), 'source.properties'), '')
            }

            if (cmd[0].endsWith('avdmanager')) {
              await mkdir(join(homeDirectory, '.android', 'avd', 'named_phone.avd'), { recursive: true })
              await writeFile(join(homeDirectory, '.android', 'avd', 'named_phone.ini'), 'path=named_phone.avd\n')
            }

            return ''
          },
          runText: async () => {
            throw new Error('Unexpected emulator name prompt.')
          },
        },
      )

      expect(commands.map((command) => command.join(' '))).toContain(
        `${join(sdkRoot, 'cmdline-tools', 'latest', 'bin', 'avdmanager')} create avd --abi arm64-v8a --device pixel_9_pro_xl --force --name named_phone --package ${systemImage} --sdcard 512M`,
      )
    } finally {
      await rm(rootDirectory, { force: true, recursive: true })
    }
  })

  test('deletes installed emulators through avdmanager', async () => {
    const commands: Array<[string, ...string[]]> = []

    await deleteInstalledAvds(['Alpha', 'Beta'], '/sdk', {
      runCommand: async (cmd) => {
        commands.push(cmd)
        return ''
      },
    })

    expect(commands).toEqual([
      ['/sdk/cmdline-tools/latest/bin/avdmanager', 'delete', 'avd', '--name', 'Alpha'],
      ['/sdk/cmdline-tools/latest/bin/avdmanager', 'delete', 'avd', '--name', 'Beta'],
    ])
  })

  test('selects installed emulators before deleting when names are omitted', async () => {
    const homeDirectory = await createTemporaryDirectory('solana-mobile-avd-delete-select-')
    const commands: Array<[string, ...string[]]> = []

    try {
      await mkdir(join(homeDirectory, '.android', 'avd', 'Alpha.avd'), { recursive: true })
      await mkdir(join(homeDirectory, '.android', 'avd', 'Beta.avd'), { recursive: true })
      await writeFile(join(homeDirectory, '.android', 'avd', 'Alpha.ini'), 'path=Alpha.avd\n')
      await writeFile(join(homeDirectory, '.android', 'avd', 'Beta.ini'), 'path=Beta.avd\n')
      await writeFile(join(homeDirectory, '.android', 'avd', 'Alpha.avd', 'config.ini'), 'target=android-36\n')
      await writeFile(join(homeDirectory, '.android', 'avd', 'Beta.avd', 'config.ini'), 'target=android-35\n')

      await runEmulatorDelete(
        {
          names: [],
          sdkRoot: '/sdk',
        },
        {
          getHomeDirectory: () => homeDirectory,
          runCommand: async (cmd) => {
            commands.push(cmd)
            return ''
          },
          runMultiselect: async (options) => {
            expect(options.options.map((option) => option.value)).toEqual(['Alpha', 'Beta'])
            return ['Beta']
          },
        },
      )

      expect(commands).toEqual([['/sdk/cmdline-tools/latest/bin/avdmanager', 'delete', 'avd', '--name', 'Beta']])
    } finally {
      await rm(homeDirectory, { force: true, recursive: true })
    }
  })

  test('skips delete selection when no emulators are installed', async () => {
    const homeDirectory = await createTemporaryDirectory('solana-mobile-avd-delete-empty-')
    const commands: Array<[string, ...string[]]> = []

    try {
      await runEmulatorDelete(
        {
          names: [],
          sdkRoot: '/sdk',
        },
        {
          getHomeDirectory: () => homeDirectory,
          runCommand: async (cmd) => {
            commands.push(cmd)
            return ''
          },
          runMultiselect: async () => {
            throw new Error('Unexpected delete selection prompt.')
          },
        },
      )

      expect(commands).toEqual([])
    } finally {
      await rm(homeDirectory, { force: true, recursive: true })
    }
  })

  test('lists running emulators from adb', async () => {
    const running = await listRunningEmulators({
      runCommand: async (cmd) => {
        if (cmd.join(' ') === 'adb devices') {
          return 'List of devices attached\nemulator-5556 device\nemulator-5554 device\nphone-1 device\n'
        }

        if (cmd.join(' ') === 'adb -s emulator-5554 emu avd name') {
          return 'Beta\nOK\n'
        }

        if (cmd.join(' ') === 'adb -s emulator-5556 emu avd name') {
          return 'Alpha\n'
        }

        throw new Error(`Unexpected command: ${cmd.join(' ')}`)
      },
    })

    expect(running).toEqual([
      { name: 'Alpha', serial: 'emulator-5556' },
      { name: 'Beta', serial: 'emulator-5554' },
    ])
  })

  test('lists emulator statuses from installed AVDs and adb state', async () => {
    const homeDirectory = await createTemporaryDirectory('solana-mobile-avd-status-')

    try {
      await mkdir(join(homeDirectory, '.android', 'avd', 'Alpha.avd'), { recursive: true })
      await mkdir(join(homeDirectory, '.android', 'avd', 'Beta.avd'), { recursive: true })
      await writeFile(join(homeDirectory, '.android', 'avd', 'Alpha.ini'), 'path=Alpha.avd\n')
      await writeFile(join(homeDirectory, '.android', 'avd', 'Beta.ini'), 'path=Beta.avd\n')
      await writeFile(
        join(homeDirectory, '.android', 'avd', 'Alpha.avd', 'config.ini'),
        'hw.device.name=pixel_9\ntarget=android-36\n',
      )
      await writeFile(
        join(homeDirectory, '.android', 'avd', 'Beta.avd', 'config.ini'),
        'hw.device.name=pixel_8\ntarget=android-35\n',
      )

      const statuses = await listEmulatorStatuses({
        getHomeDirectory: () => homeDirectory,
        runCommand: async (cmd) => {
          if (cmd.join(' ') === 'adb devices') {
            return 'List of devices attached\nemulator-5554 device\n'
          }

          if (cmd.join(' ') === 'adb -s emulator-5554 emu avd name') {
            return 'Alpha\nOK\n'
          }

          if (cmd.join(' ') === 'adb -s emulator-5554 shell getprop sys.boot_completed') {
            return '1\n'
          }

          throw new Error(`Unexpected command: ${cmd.join(' ')}`)
        },
      })

      expect(statuses).toEqual([
        {
          booted: 'yes',
          device: 'pixel_9',
          name: 'Alpha',
          serial: 'emulator-5554',
          state: 'online',
          target: 'android-36',
        },
        {
          booted: 'no',
          device: 'pixel_8',
          name: 'Beta',
          serial: undefined,
          state: 'offline',
          target: 'android-35',
        },
      ])
    } finally {
      await rm(homeDirectory, { force: true, recursive: true })
    }
  })

  test('lists running emulator status when it is not installed locally', async () => {
    const statuses = await listEmulatorStatuses({
      getHomeDirectory: () => '/missing-home',
      runCommand: async (cmd) => {
        if (cmd.join(' ') === 'adb devices') {
          return 'List of devices attached\nemulator-5554 device\n'
        }

        if (cmd.join(' ') === 'adb -s emulator-5554 emu avd name') {
          return 'Ghost\n'
        }

        if (cmd.join(' ') === 'adb -s emulator-5554 shell getprop sys.boot_completed') {
          return '0\n'
        }

        throw new Error(`Unexpected command: ${cmd.join(' ')}`)
      },
    })

    expect(statuses).toEqual([
      {
        booted: 'no',
        name: 'Ghost',
        serial: 'emulator-5554',
        state: 'online',
      },
    ])
  })

  test('starts an installed emulator', async () => {
    const homeDirectory = await createTemporaryDirectory('solana-mobile-avd-start-')
    const startedCommands: Array<[string, ...string[]]> = []

    try {
      await mkdir(join(homeDirectory, '.android', 'avd', 'Alpha.avd'), { recursive: true })
      await writeFile(join(homeDirectory, '.android', 'avd', 'Alpha.ini'), 'path=Alpha.avd\n')
      await writeFile(join(homeDirectory, '.android', 'avd', 'Alpha.avd', 'config.ini'), 'target=android-36\n')

      await startEmulator(
        { name: 'Alpha', sdkRoot: '/sdk' },
        {
          getHomeDirectory: () => homeDirectory,
          startProcess: async (cmd) => {
            startedCommands.push(cmd)
          },
        },
      )

      expect(startedCommands).toEqual([['/sdk/emulator/emulator', '@Alpha']])
    } finally {
      await rm(homeDirectory, { force: true, recursive: true })
    }
  })

  test('selects an installed emulator before starting when name is omitted', async () => {
    const homeDirectory = await createTemporaryDirectory('solana-mobile-avd-start-select-')
    const startedCommands: Array<[string, ...string[]]> = []

    try {
      await mkdir(join(homeDirectory, '.android', 'avd', 'Alpha.avd'), { recursive: true })
      await mkdir(join(homeDirectory, '.android', 'avd', 'Beta.avd'), { recursive: true })
      await writeFile(join(homeDirectory, '.android', 'avd', 'Alpha.ini'), 'path=Alpha.avd\n')
      await writeFile(join(homeDirectory, '.android', 'avd', 'Beta.ini'), 'path=Beta.avd\n')
      await writeFile(join(homeDirectory, '.android', 'avd', 'Alpha.avd', 'config.ini'), 'target=android-36\n')
      await writeFile(join(homeDirectory, '.android', 'avd', 'Beta.avd', 'config.ini'), 'target=android-35\n')

      await runEmulatorStart(
        { sdkRoot: '/sdk' },
        {
          getHomeDirectory: () => homeDirectory,
          runSelect: async (options) => {
            expect(options.options.map((option) => option.value)).toEqual(['Alpha', 'Beta'])
            return 'Beta'
          },
          startProcess: async (cmd) => {
            startedCommands.push(cmd)
          },
        },
      )

      expect(startedCommands).toEqual([['/sdk/emulator/emulator', '@Beta']])
    } finally {
      await rm(homeDirectory, { force: true, recursive: true })
    }
  })

  test('skips start selection when no emulators are installed', async () => {
    const homeDirectory = await createTemporaryDirectory('solana-mobile-avd-start-empty-')
    const startedCommands: Array<[string, ...string[]]> = []

    try {
      await runEmulatorStart(
        { sdkRoot: '/sdk' },
        {
          getHomeDirectory: () => homeDirectory,
          runSelect: async () => {
            throw new Error('Unexpected start selection prompt.')
          },
          startProcess: async (cmd) => {
            startedCommands.push(cmd)
          },
        },
      )

      expect(startedCommands).toEqual([])
    } finally {
      await rm(homeDirectory, { force: true, recursive: true })
    }
  })

  test('stops a running emulator by name', async () => {
    const commands: Array<[string, ...string[]]> = []

    const stopped = await stopEmulator('Alpha', {
      runCommand: async (cmd) => {
        commands.push(cmd)

        if (cmd.join(' ') === 'adb devices') {
          return 'List of devices attached\nemulator-5554 device\n'
        }

        if (cmd.join(' ') === 'adb -s emulator-5554 emu avd name') {
          return 'Alpha\n'
        }

        return ''
      },
    })

    expect(commands).toEqual([
      ['adb', 'devices'],
      ['adb', '-s', 'emulator-5554', 'emu', 'avd', 'name'],
      ['adb', '-s', 'emulator-5554', 'emu', 'kill'],
    ])
    expect(stopped).toEqual({ name: 'Alpha', serial: 'emulator-5554' })
  })

  test('selects a running emulator before stopping when name or serial is omitted', async () => {
    const commands: Array<[string, ...string[]]> = []

    await runEmulatorStop(
      {},
      {
        runCommand: async (cmd) => {
          commands.push(cmd)

          if (cmd.join(' ') === 'adb devices') {
            return 'List of devices attached\nemulator-5554 device\nemulator-5556 device\n'
          }

          if (cmd.join(' ') === 'adb -s emulator-5554 emu avd name') {
            return 'Alpha\n'
          }

          if (cmd.join(' ') === 'adb -s emulator-5556 emu avd name') {
            return 'Beta\n'
          }

          return ''
        },
        runSelect: async (options) => {
          expect(options.options).toEqual([
            { hint: 'serial: emulator-5554', label: 'Alpha', value: 'emulator-5554' },
            { hint: 'serial: emulator-5556', label: 'Beta', value: 'emulator-5556' },
          ])
          return 'emulator-5556'
        },
      },
    )

    expect(commands).toEqual([
      ['adb', 'devices'],
      ['adb', '-s', 'emulator-5554', 'emu', 'avd', 'name'],
      ['adb', '-s', 'emulator-5556', 'emu', 'avd', 'name'],
      ['adb', 'devices'],
      ['adb', '-s', 'emulator-5554', 'emu', 'avd', 'name'],
      ['adb', '-s', 'emulator-5556', 'emu', 'avd', 'name'],
      ['adb', '-s', 'emulator-5556', 'emu', 'kill'],
    ])
  })

  test('skips stop selection when no emulators are running', async () => {
    const commands: Array<[string, ...string[]]> = []

    await runEmulatorStop(
      {},
      {
        runCommand: async (cmd) => {
          commands.push(cmd)

          if (cmd.join(' ') === 'adb devices') {
            return 'List of devices attached\n'
          }

          throw new Error(`Unexpected command: ${cmd.join(' ')}`)
        },
        runSelect: async () => {
          throw new Error('Unexpected stop selection prompt.')
        },
      },
    )

    expect(commands).toEqual([['adb', 'devices']])
  })
})
