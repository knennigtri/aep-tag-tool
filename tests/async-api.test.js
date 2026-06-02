"use strict";

const assert = require("assert");
const newman = require("../newman.js");

assert.strictEqual(newman.exportTag.length, 3, "exportTag(env, pid, exportDir)");
assert.strictEqual(newman.deleteTags.length, 2, "deleteTags(env, searchStr)");
assert.strictEqual(newman.importTag.length, 4, "importTag(env, importObj, actions, globals)");

console.log("async-api tests passed");
