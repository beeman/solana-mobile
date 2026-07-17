import { spawn } from 'node:child_process'
import { basename } from 'node:path'
import type { InteractiveCommandRunner, RunCommandOptions } from './emulator-types.ts'

export const runInteractiveExecutable: InteractiveCommandRunner = async (cmd) => {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd[0], cmd.slice(1), { stdio: 'inherit' })

    child.on('error', reject)
    child.on('close', (exitCode) => {
      if (exitCode !== 0) {
        reject(new Error(`${basename(cmd[0])} exited with code ${exitCode}`))
        return
      }

      resolve()
    })
  })
}

export async function runExecutable(cmd: [string, ...string[]], options: RunCommandOptions = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd[0], cmd.slice(1), {
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    const stderr: Buffer[] = []
    const stdout: Buffer[] = []

    child.stderr.on('data', (chunk) => {
      stderr.push(Buffer.from(chunk))
    })
    child.stdout.on('data', (chunk) => {
      stdout.push(Buffer.from(chunk))
    })
    child.on('error', reject)
    child.on('close', (exitCode) => {
      const stderrText = Buffer.concat(stderr).toString()
      const stdoutText = Buffer.concat(stdout).toString()

      if (exitCode !== 0) {
        reject(new Error(stderrText.trim() || stdoutText.trim() || `${basename(cmd[0])} exited with code ${exitCode}`))
        return
      }

      resolve(stdoutText)
    })

    child.stdin.end(options.stdin)
  })
}
