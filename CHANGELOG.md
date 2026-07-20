# solana-mobile

## 0.1.1

### Patch Changes

- a46b101: Discover and install Android system images, select the latest installed Google Play image by default, and add emulator image management commands.

## 0.1.0

### Minor Changes

- d0c338f: Expand `doctor` with comprehensive Java, Android SDK, emulator, device, and readiness diagnostics plus verbose and JSON output.

## 0.0.1

### Patch Changes

- ad6e5b8: Add the doctor command and switch the package to a CLI-only surface.
- 677cabf: Add a create command for bootstrapping Solana Mobile projects from the Solana Mobile template catalog.
- 802a066: Use the create-solana-dapp public create flow API instead of a patched internal bundle.
- 2bfe846: Add emulator lifecycle commands for creating, listing, starting, checking, and stopping Android emulators.
- 1a02d78: Inline CLI package metadata so npx installs do not read wrapper package files.
- 56cf640: Run the published CLI with Node instead of Bun.
- f2ee903: Use the canonical git repository URL in package metadata.
- 5ea62c3: Show command help instead of an interactive menu when no command is provided.
- c05ed30: Add npm package metadata required for trusted publishing provenance.
