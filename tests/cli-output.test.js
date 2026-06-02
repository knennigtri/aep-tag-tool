"use strict";

const assert = require("assert");
const cliOutput = require("../cliOutput.js");

assert.strictEqual(
  cliOutput.formatImportActions(["C", "E", "R"]),
  "Create property → Extensions → Rules"
);
assert.strictEqual(cliOutput.countExportItems([1, 2, 3]), 3);
assert.strictEqual(cliOutput.countExportItems({ a: 1, b: 2 }), 2);
assert.strictEqual(
  cliOutput.stepLabel("auth", ""),
  "Authenticate with Adobe IMS"
);

console.log("cli-output tests passed");
