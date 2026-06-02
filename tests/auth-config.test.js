"use strict";

const assert = require("assert");
const authConfig = require("../authConfig.js");
const pmEnv = require("../pmEnvironment.js");

const exampleWorkspace = "tests/auths/auth-workspace.example.json";
const flatOAuth = "tests/vlab2-us-oauth.json";

function getEnvMap(postmanEnv) {
  const map = {};
  for (const entry of postmanEnv.values) {
    map[entry.key] = entry.value;
  }
  return map;
}

function testWorkspaceExample() {
  const loaded = authConfig.loadAuthValuesFromFile(exampleWorkspace, "oauth");
  assert.ok(loaded, "workspace example should load");
  assert.strictEqual(loaded.source, "adobe-workspace-oauth");
  assert.strictEqual(loaded.foundValues.CLIENT_ID, "example-client-id");
  assert.strictEqual(loaded.foundValues.ORG_ID, "0000000000000000000@AdobeOrg");
  assert.strictEqual(loaded.foundValues.CLIENT_SECRETS, "example-client-secret");
  assert.strictEqual(
    loaded.foundValues.SCOPES,
    "openid,AdobeID,read_organizations,additional_info.projectedProductContext"
  );
  assert.strictEqual(loaded.foundValues.AUTH_METHOD, "oauth");
}

function testFlatOAuthNormalizesArrays() {
  const loaded = authConfig.loadAuthValuesFromFile(flatOAuth, "oauth");
  assert.ok(loaded, "flat oauth should load");
  assert.strictEqual(loaded.source, "flat");
  assert.strictEqual(typeof loaded.foundValues.CLIENT_SECRETS, "string");
  assert.strictEqual(typeof loaded.foundValues.SCOPES, "string");
  assert.ok(!loaded.foundValues.SCOPES.includes("["));
  assert.ok(loaded.foundValues.SCOPES.includes(","));
}

function testPostmanEnvironmentBuild() {
  const env = pmEnv.createAuthObj(exampleWorkspace, "oauth");
  assert.ok(env, "postman env should be created");
  const map = getEnvMap(env);
  assert.strictEqual(map.AUTH_METHOD, "oauth");
  assert.strictEqual(typeof map.CLIENT_SECRETS, "string");
  assert.strictEqual(typeof map.SCOPES, "string");
}

function testDetectAuthMethod() {
  const fs = require("fs");
  const parsed = JSON.parse(fs.readFileSync(exampleWorkspace, "utf8"));
  assert.strictEqual(
    authConfig.detectAuthMethodFromConfig(parsed),
    "oauth"
  );
}

testWorkspaceExample();
testFlatOAuthNormalizesArrays();
testPostmanEnvironmentBuild();
testDetectAuthMethod();
console.log("auth-config tests passed");
