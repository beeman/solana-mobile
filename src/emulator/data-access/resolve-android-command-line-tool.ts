import { join } from 'node:path'
import type { DirectoryReader, PathChecker } from './emulator-types.ts'
import { defaultReadDirectory } from './list-installed-avds.ts'

interface ResolveAndroidCommandLineToolDependencies {
  pathExists: PathChecker
  readDirectory?: DirectoryReader
}

export async function resolveAndroidCommandLineTool(
  sdkRoot: string,
  tool: string,
  { pathExists, readDirectory = defaultReadDirectory }: ResolveAndroidCommandLineToolDependencies,
): Promise<string> {
  const commandLineToolsRoot = join(sdkRoot, 'cmdline-tools')
  const directories = await listDirectoryNames(commandLineToolsRoot, readDirectory)

  for (const directory of directories) {
    const candidate = join(commandLineToolsRoot, directory, 'bin', tool)

    if (await pathExists(candidate)) {
      return candidate
    }
  }

  throw new Error(
    `${tool} not found under ${commandLineToolsRoot}. Install Android SDK Command-line Tools through Android Studio SDK Manager.`,
  )
}

async function listDirectoryNames(directoryPath: string, readDirectory: DirectoryReader): Promise<string[]> {
  try {
    return (await readDirectory(directoryPath))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort((left, right) => {
        if (left === 'latest') return -1
        if (right === 'latest') return 1
        return right.localeCompare(left, 'en', { numeric: true })
      })
  } catch {
    return []
  }
}
