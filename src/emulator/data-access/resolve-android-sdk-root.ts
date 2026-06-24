import { homedir } from 'node:os'
import { join } from 'node:path'

export function resolveAndroidSdkRoot(environment: NodeJS.ProcessEnv = process.env, homeDirectory: string = homedir()) {
  return environment.ANDROID_SDK_ROOT ?? environment.ANDROID_HOME ?? join(homeDirectory, 'Library', 'Android', 'sdk')
}
