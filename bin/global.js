#!/usr/bin/env node

require("../cli.js").init().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});