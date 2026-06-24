export function readPackageString<TPackageKey extends string>(
  packageJson: Partial<Record<TPackageKey, unknown>>,
  key: TPackageKey,
) {
  const value = packageJson[key]

  if (typeof value !== 'string') {
    throw new Error(`package.json ${key} must be a string`)
  }

  return value
}
