# solana-mobile

CLI for Solana Mobile development.

## Features

- **Command help** — show available subcommands when no command is provided
- **Create projects** — scaffold Solana Mobile apps from the template catalog
- **Doctor checks** — local dependency checks with recommendations
- **Emulator helpers** — create, delete, install APKs, list, start, status, and stop local Android emulators
- **Interactive mode** — select a command when no command is provided

## Usage

Run the CLI without installing it:

```bash
bun x solana-mobile --help
npx solana-mobile --help
pnpx solana-mobile --help
```

Examples below use `npx`; replace it with `pnpx` or `bun x` if you prefer pnpm or Bun.

### Manage Android emulators

```bash
# List installable Mobile Wallet Adapter APKs
npx solana-mobile emulator apk list --version 2.1.1

# Create or update an emulator by answering prompts
npx solana-mobile emulator create

# Create or update a named emulator
npx solana-mobile emulator create local_phone --device pixel_9

# Create, start, and install APKs
npx solana-mobile emulator create local_phone --apk-version 2.1.1 --install-apk fakedapp-debug --install-apk fakewallet-v1-debug

# Delete by choosing from installed emulators
npx solana-mobile emulator delete

# Delete emulators by name
npx solana-mobile emulator delete local_phone

# Install APKs by choosing from the curated list
npx solana-mobile emulator install --target local_phone --version 2.1.1

# Install APKs by id
npx solana-mobile emulator install fakedapp-debug fakewallet-v1-debug --target local_phone --version 2.1.1

# List installed emulators
npx solana-mobile emulator list

# Start by choosing from installed emulators
npx solana-mobile emulator start

# Start an emulator by name
npx solana-mobile emulator start local_phone

# Show status for all installed and running emulators
npx solana-mobile emulator status

# Show status for one emulator by name or serial
npx solana-mobile emulator status local_phone

# Stop by choosing from running emulators
npx solana-mobile emulator stop

# Stop a running emulator by name or serial
npx solana-mobile emulator stop local_phone

# Use the short alias
npx solana-mobile emu list
```

### Create a project

```bash
# Create a project interactively
npx solana-mobile create

# Create a project with the minimal template
npx solana-mobile create my-app --minimal

# Create a project with a package manager
npx solana-mobile create my-app --package-manager pnpm

# Create a project with a specific template
npx solana-mobile create my-app --template kit-expo-wallet

# List template ids as JSON
npx solana-mobile create --list-template-ids

# List templates
npx solana-mobile create --list-templates
```

### Check your environment

```bash
npx solana-mobile doctor
```

### Show command help

```bash
npx solana-mobile
```

### Create options

- `--dry-run` — Print the resolved creation arguments without writing files
- `--list-template-ids` — List available template ids as a JSON array
- `--list-templates` — List available templates
- `--list-versions` — Verify local Anchor, AVM, Rust, and Solana versions
- `--minimal` — Use the minimal Solana Mobile template
- `--package-manager <packageManager>` — Use `bun`, `npm`, `pnpm`, or `yarn`
- `--skip-git` — Skip git initialization
- `--skip-init` — Skip the template init script
- `--skip-install` — Skip dependency installation
- `--template <templateName>` — Use a specific template
- `--verbose` — Print verbose output

## Development

Install dependencies and run checks:

```bash
bun install
bun run ruler:apply  # apply AI agent rules
bun run check-types
bun run lint
bun test
```

### Test the local CLI

Run the source CLI while developing:

```bash
bun dev create --help
bun dev doctor
bun dev emulator list
```

Build and test the package artifact:

```bash
bun run build
node dist/cli.mjs create --help
node dist/cli.mjs doctor
```

## Testing

Unit tests (`bun test`) run without any external dependencies.

## License

MIT – see [LICENSE](./LICENSE).
