# solana-mobile

CLI for Solana Mobile development.

## Features

- **Clack prompts** — interactive command selection when no command is provided
- **Commander** — subcommand routing for the CLI
- **Doctor checks** — local dependency checks with recommendations

## Installation

```bash
bun install
```

## Usage

```bash
bun run build
node dist/cli.mjs doctor
```

## CLI

```bash
# Build the CLI
bun run build

# Select a command interactively
node dist/cli.mjs

# Check local development dependencies
node dist/cli.mjs doctor
```

## Development

```bash
bun install
bun run ruler:apply  # apply AI agent rules
bun run build
bun run check-types
bun run lint
bun test
```

## Testing

Unit tests (`bun test`) run without any external dependencies.

## License

MIT – see [LICENSE](./LICENSE).
