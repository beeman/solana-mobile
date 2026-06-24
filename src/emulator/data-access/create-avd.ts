import { constants } from 'node:fs'
import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import {
  createAvdConfigValues,
  getToolPaths,
  parseAvdConfig,
  parseSystemImagePackage,
  resolveCreateOptions,
  serializeAvdConfig,
} from './avd-config.ts'
import type {
  CreateAvdDependencies,
  CreateAvdResult,
  EmulatorCreateCommandOptions,
  PathChecker,
} from './emulator-types.ts'
import { runExecutable } from './run-executable.ts'

export async function createAvd(
  options: EmulatorCreateCommandOptions,
  {
    getHomeDirectory = homedir,
    pathExists = defaultPathExists(),
    readTextFile = defaultReadTextFile,
    runCommand = runExecutable,
    writeTextFile = defaultWriteTextFile,
  }: CreateAvdDependencies = {},
): Promise<CreateAvdResult> {
  const resolvedOptions = resolveCreateOptions(options)
  const toolPaths = getToolPaths(resolvedOptions.sdkRoot)
  const homeDirectory = getHomeDirectory()
  const avdDirectory = join(homeDirectory, '.android', 'avd', `${resolvedOptions.name}.avd`)

  if (await pathExists(avdDirectory)) {
    return {
      created: false,
      emulatorPath: toolPaths.emulator,
      name: resolvedOptions.name,
      sdkRoot: resolvedOptions.sdkRoot,
      systemImage: resolvedOptions.systemImage,
    }
  }

  const { abi } = parseSystemImagePackage(resolvedOptions.systemImage)

  if (!(await isInstalledSystemImage(resolvedOptions.sdkRoot, resolvedOptions.systemImage, pathExists))) {
    await runCommand([toolPaths.sdkmanager, '--install', resolvedOptions.systemImage])
  }

  if (!(await isInstalledSystemImage(resolvedOptions.sdkRoot, resolvedOptions.systemImage, pathExists))) {
    throw new Error(`System image is not installed: ${resolvedOptions.systemImage}`)
  }

  const avdConfigPath = getAvdConfigPath(homeDirectory, resolvedOptions.name)

  await runCommand(
    [
      toolPaths.avdmanager,
      'create',
      'avd',
      '--abi',
      abi,
      '--device',
      resolvedOptions.device,
      '--force',
      '--name',
      resolvedOptions.name,
      '--package',
      resolvedOptions.systemImage,
      '--sdcard',
      resolvedOptions.sdcardSize,
    ],
    { stdin: 'no\n' },
  )

  if (!(await pathExists(avdDirectory))) {
    throw new Error(`Emulator directory does not exist: ${avdDirectory}`)
  }

  const existingConfig = (await pathExists(avdConfigPath)) ? await readTextFile(avdConfigPath) : ''

  await writeTextFile(
    avdConfigPath,
    serializeAvdConfig({
      ...parseAvdConfig(existingConfig),
      ...createAvdConfigValues(resolvedOptions),
    }),
  )

  return {
    created: true,
    emulatorPath: toolPaths.emulator,
    name: resolvedOptions.name,
    sdkRoot: resolvedOptions.sdkRoot,
    systemImage: resolvedOptions.systemImage,
  }
}

export function defaultPathExists(mode: number = constants.F_OK): PathChecker {
  return async (filePath: string) => {
    try {
      await access(filePath, mode)
      return true
    } catch {
      return false
    }
  }
}

export async function defaultWriteTextFile(filePath: string, contents: string) {
  await mkdir(dirname(filePath), { recursive: true })
  await writeFile(filePath, contents)
}

function getAvdConfigPath(homeDirectory: string, avdName: string): string {
  return join(homeDirectory, '.android', 'avd', `${avdName}.avd`, 'config.ini')
}

function getSystemImageDirectory(sdkRoot: string, systemImage: string): string {
  return join(sdkRoot, ...systemImage.split(';'))
}

async function defaultReadTextFile(filePath: string) {
  return readFile(filePath, 'utf8')
}

async function isInstalledSystemImage(sdkRoot: string, systemImage: string, pathExists: PathChecker) {
  return pathExists(join(getSystemImageDirectory(sdkRoot, systemImage), 'source.properties'))
}
