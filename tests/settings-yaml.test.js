"use strict";

const assert = require("assert");
const importObjUtil = require("../importObjectUtil.js");
const path = require("path");

const fixtureImport = path.join(__dirname, "fixtures/minimal-import.json");
const minimalSettings = path.join(__dirname, "fixtures/minimal-settings.yml");
const vlab2Settings = path.join(__dirname, "vlab2-settings.yml");

const resolved = importObjUtil.resolveVarsInValue(
  { orgId: "{{ orgId }}", clientCode: "abc" },
  { orgId: "test@AdobeOrg" }
);
assert.strictEqual(resolved.orgId, "test@AdobeOrg");
assert.strictEqual(resolved.clientCode, "abc");

const updated = importObjUtil.updateSettings(
  JSON.parse(JSON.stringify(require(fixtureImport))),
  minimalSettings
);
const mcid = updated.extensions.find((e) => e.attributes.name === "adobe-mcid");
const mcidSettings = JSON.parse(mcid.attributes.settings);
assert.strictEqual(mcidSettings.orgId, "new@AdobeOrg");

const de = updated.dataElements.find((e) => e.attributes.name === "aemPublish_cookieDomain");
const deSettings = JSON.parse(de.attributes.settings);
assert.strictEqual(deSettings.value, "new.example.com");

const vlab2Updated = importObjUtil.updateSettings(
  JSON.parse(JSON.stringify(require(fixtureImport))),
  vlab2Settings
);
const vlab2De = vlab2Updated.dataElements.find(
  (e) => e.attributes.name === "aemPublish_cookieDomain"
);
assert.strictEqual(
  JSON.parse(vlab2De.attributes.settings).value,
  "publish-p50203-e440914.adobeaemcloud.com"
);

const validation = importObjUtil.validateSettings(fixtureImport, minimalSettings);
assert.ok(validation.ok, validation.errors.join("; "));
assert.ok(validation.matched.length >= 3);

const badValidation = importObjUtil.validateSettings(
  fixtureImport,
  path.join(__dirname, "fixtures/bad-settings.yml")
);
assert.strictEqual(badValidation.ok, false);

console.log("settings-yaml tests passed");
