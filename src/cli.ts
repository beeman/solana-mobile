#!/usr/bin/env node

import { runApp } from './app.ts'

runApp().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
