import { describe, expect, test } from 'bun:test'
import { checkAdbVersion, parseAdbVersion } from '../src/doctor/data-access/check-adb-version.ts'
import { checkNodeVersion, normalizeNodeVersion } from '../src/doctor/data-access/check-node-version.ts'

describe('checkAdbVersion', () => {
  test('detects missing adb', async () => {
    const result = await checkAdbVersion(async () => {
      throw new Error('missing')
    })

    expect(result.ok).toBe(false)
    expect(result.recommendation).toContain('Android SDK Platform Tools')
  })

  test('passes adb 33 or higher', async () => {
    const result = await checkAdbVersion(async () => 'Android Debug Bridge version 1.0.41\nVersion 33.0.3-8952118\n')

    expect(result.actual).toBe('33.0.3')
    expect(result.ok).toBe(true)
  })

  test('parses adb platform-tools version', () => {
    expect(parseAdbVersion('Android Debug Bridge version 1.0.41\nVersion 36.0.0-13206524\n')).toBe('36.0.0')
  })
})

describe('checkNodeVersion', () => {
  test('fails below Node.js 22', () => {
    expect(checkNodeVersion('v21.7.3').ok).toBe(false)
  })

  test('passes Node.js 22 or higher', () => {
    expect(checkNodeVersion('v22.12.0').ok).toBe(true)
  })

  test('normalizes leading v', () => {
    expect(normalizeNodeVersion('v22.12.0')).toBe('22.12.0')
  })
})
