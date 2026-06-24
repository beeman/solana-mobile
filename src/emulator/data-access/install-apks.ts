import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { AndroidApk } from './apk-catalog.ts'
import type { CommandRunner } from './emulator-types.ts'
import { runExecutable } from './run-executable.ts'

export type BinaryFetcher = (url: string) => Promise<Uint8Array>
export type BinaryFileWriter = (filePath: string, contents: Uint8Array) => Promise<void>
export type DirectoryRemover = (directoryPath: string) => Promise<void>
export type TemporaryDirectoryCreator = () => Promise<string>

export interface InstallAndroidApksDependencies {
  createTemporaryDirectory?: TemporaryDirectoryCreator
  fetchBinary?: BinaryFetcher
  removeDirectory?: DirectoryRemover
  runCommand?: CommandRunner
  writeBinaryFile?: BinaryFileWriter
}

export interface InstallAndroidApksOptions {
  apks: readonly AndroidApk[]
  serial: string
}

export interface InstalledAndroidApk {
  id: string
  serial: string
}

export async function defaultCreateTemporaryApkDirectory(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'solana-mobile-apks-'))
}

export async function defaultFetchBinary(url: string): Promise<Uint8Array> {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Failed to download APK: ${response.status} ${response.statusText}`)
  }

  return new Uint8Array(await response.arrayBuffer())
}

export async function defaultRemoveDirectory(directoryPath: string): Promise<void> {
  await rm(directoryPath, { force: true, recursive: true })
}

export async function installAndroidApks(
  { apks, serial }: InstallAndroidApksOptions,
  {
    createTemporaryDirectory = defaultCreateTemporaryApkDirectory,
    fetchBinary = defaultFetchBinary,
    removeDirectory = defaultRemoveDirectory,
    runCommand = runExecutable,
    writeBinaryFile = writeFile,
  }: InstallAndroidApksDependencies = {},
): Promise<InstalledAndroidApk[]> {
  const apkDirectory = await createTemporaryDirectory()

  try {
    const installedApks: InstalledAndroidApk[] = []

    for (const apk of apks) {
      const apkPath = join(apkDirectory, apk.assetName)

      await writeBinaryFile(apkPath, await fetchBinary(apk.downloadUrl))
      await runCommand(['adb', '-s', serial, 'install', '-r', apkPath])
      installedApks.push({
        id: apk.id,
        serial,
      })
    }

    return installedApks
  } finally {
    await removeDirectory(apkDirectory)
  }
}
