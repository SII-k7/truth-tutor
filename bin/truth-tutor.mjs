#!/usr/bin/env node

import { run } from '../src/cli.mjs';

run().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
});
