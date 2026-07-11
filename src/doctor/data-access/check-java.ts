import { join } from 'node:path'
import type { DoctorCheckResult } from './doctor-check-result.ts'
import { type DoctorEnvironment, findExecutable, parseVersion } from './doctor-environment.ts'

export function parseJavaVersion(output: string) {
  const quoted = output.match(/version\s+"([^"]+)"/i)?.[1]
  return quoted ? parseVersion(quoted) : parseVersion(output)
}

export async function checkJava(environment: DoctorEnvironment): Promise<DoctorCheckResult[]> {
  const java = await checkJavaExecutable(environment)
  const compiler = await checkJavaCompiler(environment, java.status !== 'fail')
  const javaHome = await checkJavaHome(environment, java.status !== 'fail' && compiler.status !== 'fail')
  return [java, compiler, javaHome]
}

async function checkJavaExecutable(environment: DoctorEnvironment): Promise<DoctorCheckResult> {
  const executable = await findExecutable('java', environment)
  if (!executable) return javaFailure('Java', 'Java is not available.', 'Install JDK 17 or higher.')
  try {
    const result = await environment.runCommand(executable, ['-version'])
    const version = parseJavaVersion(`${result.stdout}\n${result.stderr}`)
    const passes = Boolean(version) && Number.parseInt(version ?? '', 10) >= 17
    return {
      actual: version ?? 'unknown',
      category: 'java',
      details: [`Executable: ${executable}`],
      message: version ? `Detected Java ${version}.` : 'Unable to parse the Java version.',
      name: 'Java',
      recommendation: passes ? undefined : 'Install JDK 17 or higher.',
      required: '17 or higher',
      status: passes ? 'pass' : 'fail',
    }
  } catch {
    return javaFailure('Java', 'Java is not usable.', 'Install JDK 17 or higher.')
  }
}

async function checkJavaCompiler(environment: DoctorEnvironment, javaAvailable: boolean): Promise<DoctorCheckResult> {
  const executable = await findExecutable('javac', environment)
  if (!executable)
    return javaFailure(
      'Java compiler',
      'javac is not available.',
      'Install a complete JDK 17 or higher, not only a JRE.',
    )
  try {
    const result = await environment.runCommand(executable, ['-version'])
    const version = parseJavaVersion(`${result.stdout}\n${result.stderr}`)
    return {
      actual: version ?? 'available',
      category: 'java',
      details: [`Executable: ${executable}`],
      message: `Detected Java compiler ${version ?? ''}.`.trim(),
      name: 'Java compiler',
      required: 'JDK 17 or higher',
      status: javaAvailable ? 'pass' : 'fail',
    }
  } catch {
    return javaFailure('Java compiler', 'javac is not usable.', 'Install a complete JDK 17 or higher.')
  }
}

async function checkJavaHome(environment: DoctorEnvironment, toolsAvailable: boolean): Promise<DoctorCheckResult> {
  const configured = environment.environment.JAVA_HOME
  if (!configured)
    return {
      actual: 'not set',
      category: 'java',
      message: 'JAVA_HOME is not set.',
      name: 'JAVA_HOME',
      recommendation: 'Set JAVA_HOME to your JDK path to make Java discovery deterministic.',
      status: toolsAvailable ? 'warn' : 'fail',
    }
  const resolved = await environment.resolvePath(configured).catch(() => configured)
  const javaPath = join(resolved, 'bin', environment.getPlatform() === 'win32' ? 'java.exe' : 'java')
  if (!(await environment.pathExists(resolved)) || !(await environment.pathExists(javaPath))) {
    return {
      actual: resolved,
      category: 'java',
      message: 'JAVA_HOME does not point to a usable JDK.',
      name: 'JAVA_HOME',
      recommendation:
        environment.getPlatform() === 'win32'
          ? 'Set JAVA_HOME to the installed JDK directory in Windows environment variables.'
          : 'Set JAVA_HOME to the installed JDK directory.',
      status: 'fail',
    }
  }
  return {
    actual: resolved,
    category: 'java',
    details: [`Java executable: ${javaPath}`],
    message: `JAVA_HOME resolves to ${resolved}.`,
    name: 'JAVA_HOME',
    status: 'pass',
  }
}

function javaFailure(name: string, message: string, recommendation: string): DoctorCheckResult {
  return {
    actual: 'not found',
    category: 'java',
    message,
    name,
    recommendation,
    required: '17 or higher',
    status: 'fail',
  }
}
