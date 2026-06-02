const parserUtil = require("./parserUtil.js");

const auth = {
  jwt: "jwt",
  oauth: "oauth"
};

/**
 * Coerce auth fields to strings Postman/Newman expect in environment variables.
 * @param {string} key
 * @param {*} value
 * @returns {*}
 */
function normalizeAuthEnvValue(key, value) {
  if (value === undefined || value === null) {
    return value;
  }
  if (key === "CLIENT_SECRETS") {
    if (Array.isArray(value)) {
      const first = value.find((s) => typeof s === "string" && s.length > 0);
      return first || "";
    }
    return String(value);
  }
  if (key === "SCOPES") {
    if (Array.isArray(value)) {
      return value
        .filter((s) => typeof s === "string" && s.length > 0)
        .join(",");
    }
    if (typeof value === "string" && value.includes(" ") && !value.includes(",")) {
      return value.trim().split(/\s+/).filter(Boolean).join(",");
    }
    return String(value);
  }
  return value;
}

/**
 * Flatten Adobe Developer Console project/workspace JSON into legacy auth fields.
 * @param {object} parsed Root JSON object
 * @param {string} authMethod `oauth` or `jwt`
 * @returns {{ flat: object, source: string }|null}
 */
function resolveFlatAuthConfig(parsed, authMethod) {
  if (!parsed || typeof parsed !== "object") {
    return null;
  }
  if (authMethod === auth.oauth) {
    const workspaceOAuth =
      parserUtil.extractOAuthFlatFromAdobeWorkspaceExport(parsed);
    if (workspaceOAuth) {
      return { flat: workspaceOAuth, source: "adobe-workspace-oauth" };
    }
  }
  if (authMethod === auth.jwt) {
    const workspaceJwt =
      parserUtil.extractJWTFlatFromAdobeWorkspaceExport(parsed);
    if (workspaceJwt) {
      return { flat: workspaceJwt, source: "adobe-workspace-jwt" };
    }
  }
  return { flat: parsed, source: "flat" };
}

/**
 * Detect OAuth vs JWT from a workspace export when CLI auth flag is omitted.
 * @param {object} parsed
 * @returns {string|null}
 */
function detectAuthMethodFromConfig(parsed) {
  if (parserUtil.extractOAuthFlatFromAdobeWorkspaceExport(parsed)) {
    return auth.oauth;
  }
  if (parserUtil.extractJWTFlatFromAdobeWorkspaceExport(parsed)) {
    return auth.jwt;
  }
  return null;
}

function collectOAuthValues(flat) {
  const foundValues = {};
  foundValues.CLIENT_ID =
    parserUtil.findNestedObj(flat, "API_KEY") ||
    parserUtil.findNestedObj(flat, "CLIENT_ID");
  foundValues.CLIENT_SECRETS = parserUtil.findNestedObj(flat, "CLIENT_SECRETS");
  foundValues.ORG_ID =
    parserUtil.findNestedObj(flat, "ORG_ID") ||
    parserUtil.findNestedObj(flat, "IMS_ORG_ID");
  foundValues.SCOPES = parserUtil.findNestedObj(flat, "SCOPES");
  foundValues.AUTH_METHOD = auth.oauth;
  return foundValues;
}

function collectJWTValues(flat, workingDir) {
  const foundValues = {};
  foundValues.CLIENT_ID =
    parserUtil.findNestedObj(flat, "API_KEY") ||
    parserUtil.findNestedObj(flat, "CLIENT_ID");
  foundValues.CLIENT_SECRET = parserUtil.findNestedObj(flat, "CLIENT_SECRET");
  foundValues.ORG_ID =
    parserUtil.findNestedObj(flat, "ORG_ID") ||
    parserUtil.findNestedObj(flat, "IMS_ORG_ID");
  foundValues.TECHNICAL_ACCOUNT_ID =
    parserUtil.findNestedObj(flat, "TECHNICAL_ACCOUNT_ID") ||
    parserUtil.findNestedObj(flat, "TECHNICAL_ACCOUNT_EMAIL");
  let privateKey = parserUtil.findNestedObj(flat, "PRIVATE_KEY");
  if (privateKey) {
    privateKey = parserUtil.resolveFileWithContents(
      privateKey,
      workingDir,
      true
    );
  }
  foundValues.PRIVATE_KEY = privateKey;
  foundValues.AUTH_METHOD = auth.jwt;
  return foundValues;
}

/**
 * Read auth config file and return key/value map for Postman environment building.
 * @param {string} file Path or inline JSON string
 * @param {string} [authMethod] `oauth` or `jwt`; inferred for workspace JSON when omitted
 * @returns {{ foundValues: object, source: string, workingDir: string }|null}
 */
function loadAuthValuesFromFile(file, authMethod) {
  const fileContents = parserUtil.getFileObj(file);
  const workingDir = parserUtil.getWorkingDir(file);
  const parsed = parserUtil.getJSONSync(fileContents);
  if (!parsed) {
    return null;
  }

  let method = authMethod;
  if (!method) {
    method = detectAuthMethodFromConfig(parsed);
  }
  if (!method) {
    method = auth.oauth;
  }

  const resolved = resolveFlatAuthConfig(parsed, method);
  if (!resolved) {
    return null;
  }

  const foundValues =
    method === auth.jwt
      ? collectJWTValues(resolved.flat, workingDir)
      : collectOAuthValues(resolved.flat);

  for (const key of Object.keys(foundValues)) {
    foundValues[key] = normalizeAuthEnvValue(key, foundValues[key]);
  }

  return {
    foundValues,
    source: resolved.source,
    workingDir
  };
}

exports.auth = auth;
exports.normalizeAuthEnvValue = normalizeAuthEnvValue;
exports.resolveFlatAuthConfig = resolveFlatAuthConfig;
exports.detectAuthMethodFromConfig = detectAuthMethodFromConfig;
exports.loadAuthValuesFromFile = loadAuthValuesFromFile;
