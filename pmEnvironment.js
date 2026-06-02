const authConfig = require("./authConfig.js");
//https://www.npmjs.com/package/debug
//Mac: DEBUG=* aep-tag-tool....
//WIN: set DEBUG=* & aep-tag-tool....
const debugPMEnv = require("debug")("pmEnv");
exports.debugOptions = {
  "pmEnv": "Messages related to postman environment file"
};
const POSTMAN_ENV = require("./postman/aep-tag-tool.postman_environment.json");

function createEnvObjFromConfig(file, authMethod) {
  const loaded = authConfig.loadAuthValuesFromFile(file, authMethod);
  if (!loaded) {
    return;
  }

  if (loaded.source.startsWith("adobe-workspace")) {
    debugPMEnv(
      "Using auth fields from Developer Console project/workspace JSON (" +
      loaded.source +
      ")."
    );
  }

  const { foundValues } = loaded;
  const expectedCount = foundValues.AUTH_METHOD === authConfig.auth.jwt ? 6 : 5;
  let postmanObj = POSTMAN_ENV;
  let authParamCount = 0;

  debugPMEnv("Looking for auth values in config file...");
  for (const key in foundValues) {
    if (foundValues[key]) {
      postmanObj = setEnvValue(postmanObj, key, foundValues[key]);
      debugPMEnv(key + " set.");
      authParamCount++;
    } else {
      console.error("Could not find " + key);
    }
  }

  if (authParamCount === expectedCount) {
    debugPMEnv(postmanObj);
    return postmanObj;
  }
}

//Helper method update (or add) a key/value pair to a Postman Environment JSON
function setEnvValue(envObj, key, value) {
  value = authConfig.normalizeAuthEnvValue(key, value);
  envObj = JSON.parse(JSON.stringify(envObj));
  let addVal = true;
  let envVal = {};
  if (envObj && envObj.values) {
    for (let i = 0; i < envObj.values.length; i++) {
      envVal = envObj.values[i];
      if (envVal.key == key) {
        addVal = false;
        envVal.value = value;
        envObj.values[i] = envVal;
        i = envObj.values.length;
      }
    }
    if (addVal) {
      envVal = {
        "type": "any",
        "value": value,
        "key": key
      };
      envObj.values.push(envVal);
    }
    return envObj;
  }
  return null;
}

function getEnvValue(envObj, key) {
  let envVals = JSON.parse(JSON.stringify(envObj.values));
  for (var element of envVals) {
    if (element.key == key) {
      return element.value;
    }
  }
  return "";
}

exports.createAuthObj = createEnvObjFromConfig;
exports.setEnvValue = setEnvValue;
exports.getEnvValue = getEnvValue;
exports.auth = authConfig.auth;
