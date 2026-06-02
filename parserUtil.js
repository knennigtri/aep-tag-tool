const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
const debug = require("debug");
const debugJSON = debug("parser:json");
const debugReplace = debug("parser:replace");
const debugVerbose = debug("parser:verbose");
exports.debugOptions = {
  "parser:json": "Messages on JSON obj creation from files",
  "parser:replace": "Messages on key/value replacement",
  "parser:verbose": ""
};

//Input yaml contents or JSON contents to return a valid JSON object
function getJSONSync(propertyContents){
  debugJSON(getJSONSync);
  let dataObj = {};
  // Parse the propertyContents from YAML or JSON
  try {
    //Attempt to read the YAML and output JSON
    let data = yaml.loadAll(propertyContents,"json");
    let yamlContents = JSON.stringify(data[0], null, 2);
    dataObj = JSON.parse(yamlContents);
  } catch {
    console.log("Could not read YAML, attemping JSON...");
    try {
      //Attempt to read JSON
      dataObj = JSON.parse(propertyContents);
    } catch(err){
      new Error("File does not contain valid YAML or JSON content.",{cause: err.name});
    }
  }
  debugJSON(dataObj);
  return dataObj;
}

// Looks through a json object for a keyToFind and if found, 
// replaces the value with newValue
function replaceValueInJSON(jsonObject, keyToFind, newValue) {
  if (typeof jsonObject !== "object" || jsonObject === null) {
    return jsonObject;
  }
  
  if (Array.isArray(jsonObject)) {
    
    for (let i = 0; i < jsonObject.length; i++) {
      jsonObject[i] = replaceValueInJSON(jsonObject[i], keyToFind, newValue);
    }
  } else {
    for (const key in jsonObject) {
      debugReplace("replace: " + key);
      if (key === keyToFind) {
        debugReplace("Found key '" + keyToFind + "' with value '" + jsonObject[key] + "' and replacing with '" + newValue + "'");
        jsonObject[key] = newValue;
      } else {
        jsonObject[key] = replaceValueInJSON(jsonObject[key], keyToFind, newValue);
      }
    }
  }
  return jsonObject;
}

//helper method to get the file contents and working directory of the config file
// {
//   contents: <contents of file>
//   workingDir: <dir of file>
// }
function getFileObjAndWorkingDir(file){
  let obj = {};
  if(typeof file == "string"){
    if(fs.lstatSync(file).isFile()){
      file = path.resolve(file);
      obj.contents = fs.readFileSync(file, "utf8");
      obj.workingDir = path.dirname(file);
    } else {
      obj.contents = file;
      obj.workingDir = "./";
    }
  } else {
    obj.contents = "{}";
    obj.workingDir = "./";
  }
  
  return obj;
}

function getFileObj(file){
  return getFileObjAndWorkingDir(file).contents;
}

function getWorkingDir(file){
  return getFileObjAndWorkingDir(file).workingDir;
}


//Helper function to find the value of a nested key an a json object
function findNestedObj(entireObj, keyToFind) {
  let foundValue;
  JSON.stringify(entireObj, (curKey, curVal) => {
    if(curKey.toUpperCase().replace("-","_").replace(" ","_") == keyToFind){
      debugVerbose("Found: " + keyToFind);
      foundValue = curVal;
    }
    return curVal;
  });
  return foundValue;
}

/**
 * @param {object} entireObj Parsed Adobe IO project/workspace JSON root
 * @returns {{ creds: object[], imsOrg: string }|null}
 */
function getAdobeWorkspaceCredentialContext(entireObj) {
  const project = entireObj && entireObj.project;
  if (!project || typeof project !== "object") {
    return null;
  }
  const details = project.workspace && project.workspace.details;
  const creds = details && Array.isArray(details.credentials) ? details.credentials : null;
  if (!creds || creds.length === 0) {
    return null;
  }

  let imsOrg = "";
  if (project.org && typeof project.org === "object") {
    if (typeof project.org.ims_org_id === "string") {
      imsOrg = project.org.ims_org_id;
    }
    if (!imsOrg && typeof project.org.imsOrgId === "string") {
      imsOrg = project.org.imsOrgId;
    }
  }
  if (!imsOrg) {
    return null;
  }
  return { creds, imsOrg };
}

/**
 * Adobe Developer Console project/workspace JSON nests OAuth Server-to-Server
 * credentials under `project.workspace.details.credentials[].oauth_server_to_server`.
 * Returns a shallow object `{ CLIENT_ID, CLIENT_SECRETS, ORG_ID, SCOPES }` suitable
 * for OAuth Postman auth, or `null` if this is not that shape (legacy configs still use
 * `findNestedObj` recursively).
 *
 * Prefer a credential whose `integration_type` is `oauth_server_to_server`.
 *
 * @param {object} entireObj Parsed JSON root
 * @returns {object|null}
 */
function extractOAuthFlatFromAdobeWorkspaceExport(entireObj) {
  const ctx = getAdobeWorkspaceCredentialContext(entireObj);
  if (!ctx) {
    return null;
  }
  const { creds, imsOrg } = ctx;

  const withOauth = creds.filter(
    (c) => c &&
      typeof c === "object" &&
      c.oauth_server_to_server &&
      typeof c.oauth_server_to_server === "object"
  );
  if (!withOauth.length) {
    return null;
  }
  let entry = withOauth.find(
    (c) => c.integration_type === "oauth_server_to_server"
  );
  if (!entry) {
    entry = withOauth[0];
  }
  const oauth = entry.oauth_server_to_server;

  const clientId = oauth.client_id;
  const secrets = oauth.client_secrets;
  const scopes = oauth.scopes;

  if (typeof clientId !== "string" || !secrets || !Array.isArray(secrets) ||
    secrets.length === 0 || !Array.isArray(scopes)) {
    return null;
  }

  return {
    CLIENT_ID: clientId,
    CLIENT_SECRETS: secrets,
    ORG_ID: imsOrg,
    SCOPES: scopes
  };
}

/**
 * Service Account (JWT) credentials in workspace exports may appear as
 * `credentials[].service_account` or legacy `credentials[].jwt` blocks.
 *
 * @param {object} entireObj Parsed JSON root
 * @returns {object|null}
 */
function extractJWTFlatFromAdobeWorkspaceExport(entireObj) {
  const ctx = getAdobeWorkspaceCredentialContext(entireObj);
  if (!ctx) {
    return null;
  }
  const { creds, imsOrg } = ctx;

  const withJwt = creds.filter((c) => {
    if (!c || typeof c !== "object") {
      return false;
    }
    const block = c.service_account || c.jwt;
    return block && typeof block === "object";
  });
  if (!withJwt.length) {
    return null;
  }

  let entry = withJwt.find((c) => {
    const t = c.integration_type;
    return typeof t === "string" &&
      (t === "service_account" || t.includes("jwt") || t.includes("service_account"));
  });
  if (!entry) {
    entry = withJwt[0];
  }
  const jwtBlock = entry.service_account || entry.jwt;

  const clientId = jwtBlock.client_id || jwtBlock.api_key;
  const clientSecret = jwtBlock.client_secret;
  const technicalAccountId =
    jwtBlock.technical_account_id || jwtBlock.technicalAccountId;
  const privateKey = jwtBlock.private_key || jwtBlock.privateKey;

  if (typeof clientId !== "string" || typeof clientSecret !== "string" ||
    typeof technicalAccountId !== "string") {
    return null;
  }

  const flat = {
    CLIENT_ID: clientId,
    CLIENT_SECRET: clientSecret,
    ORG_ID: imsOrg,
    TECHNICAL_ACCOUNT_ID: technicalAccountId,
    AUTH_METHOD: "jwt"
  };
  if (privateKey) {
    flat.PRIVATE_KEY = privateKey;
  }
  return flat;
}

/**
 * Build a safe single-segment filename base from a tag property display name.
 * @param {string} name Property name from Reactor export
 * @returns {string}
 */
function sanitizeFileBaseName(name) {
  if (name === undefined || name === null || String(name).trim() === "") {
    return "export";
  }
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[/\\:*?"<>|]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "") || "export";
}

//Helper method to either return the absPath or the contents of the config file
function resolveFileWithContents(val, workingDir, extractContents) {
  if(typeof val == "string"){
    let contents = path.resolve(workingDir,val);
    if(fs.lstatSync(contents).isFile() && extractContents){
      contents = fs.readFileSync(contents, "utf8");
      contents = contents.replace(/\n/g,""); //required for private.key
    }
    return contents;
  } else
    return val;
}

exports.replaceValueInJSON = replaceValueInJSON;
exports.getJSONSync = getJSONSync;
exports.findNestedObj = findNestedObj;
exports.getAdobeWorkspaceCredentialContext = getAdobeWorkspaceCredentialContext;
exports.extractOAuthFlatFromAdobeWorkspaceExport = extractOAuthFlatFromAdobeWorkspaceExport;
exports.extractJWTFlatFromAdobeWorkspaceExport = extractJWTFlatFromAdobeWorkspaceExport;
exports.resolveFileWithContents = resolveFileWithContents;
exports.getFileObj = getFileObj;
exports.getWorkingDir = getWorkingDir;
exports.sanitizeFileBaseName = sanitizeFileBaseName;