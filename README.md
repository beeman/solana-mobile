# solana-mobile

CLI for Solana Mobile development.

## Features

- **Create projects** — scaffold Solana Mobile apps from the template catalog
- **Doctor checks** — local dependency checks with recommendations
- **Interactive mode** — select a command when no command is provided

## Usage

Run the CLI without installing it:

```bash
bun x solana-mobile --help
npx solana-mobile --help
pnpx solana-mobile --help
```

Examples below use `npx`; replace it with `pnpx` or `bun x` if you prefer pnpm or Bun.

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

### Select a command interactively

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
