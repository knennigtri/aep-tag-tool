"use strict";

const assert = require("assert");
const cliOutput = require("../cliOutput.js");

const sample = JSON.stringify([
  { id: "PR123", name: "My Tag 2023" },
  { id: "PR456", name: "Other 2023" }
]);

const parsed = cliOutput.parseDeletePreviewList(sample);
assert.strictEqual(parsed.length, 2);
assert.strictEqual(parsed[0].id, "PR123");
assert.strictEqual(cliOutput.parseDeletePreviewList("").length, 0);
assert.strictEqual(cliOutput.parseDeletePreviewList("not json").length, 0);

console.log("delete-preview tests passed");
