"use strict";

const assert = require("assert");
const path = require("path");
const parserUtil = require("../parserUtil.js");

assert.strictEqual(
  parserUtil.sanitizeFileBaseName("U - Implementation Class 05/24"),
  "u-implementation-class-05-24"
);
assert.strictEqual(
  parserUtil.sanitizeFileBaseName("CS - Target, Analytics"),
  "cs-target,-analytics"
);
assert.strictEqual(parserUtil.sanitizeFileBaseName(""), "export");
assert.strictEqual(
  parserUtil.sanitizeFileBaseName("foo/bar\\baz"),
  "foo-bar-baz"
);

const joined = path.join(".", parserUtil.sanitizeFileBaseName("a/b") + ".json");
assert.strictEqual(joined, "a-b.json");

console.log("export-filename tests passed");
