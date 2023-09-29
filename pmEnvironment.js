const parserUtil = require("./parserUtil.js");
//https://www.npmjs.com/package/debug
//Mac: DEBUG=* aep-tag-tool....
//WIN: set DEBUG=* & aep-tag-tool....
const debugPMEnv = require("debug")("pmEnv");
exports.debugOptions = {
  "pmEnv": "Messages related to postman environment file"
};
const auth = {
  jwt: "jwt",
  oauth: "oauth"
};
const POSTMAN_ENV = require("./postman/aep-tag-tool.postman_environment.json");

function createEnvObjFromConfig(file, authMethod){
  if(authMethod == auth.oauth){
    return createOAuthEnvObjFromConfig(file, auth.oauth);
  } if(authMethod == auth.jwt) {
    return createJWTEnvObjFromConfig(file, auth.jwt);
  }
  return "";
}

// Returns a Postman Environment json with the correct variables for OAuth
function createOAuthEnvObjFromConfig(file){
  let fileContents = parserUtil.getFileObj(file);
  let fileContentsJSON = parserUtil.getJSONSync(fileContents);
  if(!fileContentsJSON) return;

  let postmanObj = POSTMAN_ENV;
  let authParamCount = 0; // counter to make sure all auth params are set

  console.log("Looking for auth values in config file...");
  let foundValues = {};
  foundValues.CLIENT_ID = parserUtil.findNestedObj(fileContentsJSON,"API_KEY") || parserUtil.findNestedObj(fileContentsJSON,"CLIENT_ID");
  foundValues.CLIENT_SECRETS = parserUtil.findNestedObj(fileContentsJSON,"CLIENT_SECRETS");
  foundValues.ORG_ID = parserUtil.findNestedObj(fileContentsJSON,"ORG_ID") || parserUtil.findNestedObj(fileContentsJSON,"IMS_ORG_ID");
  foundValues.SCOPES = parserUtil.findNestedObj(fileContentsJSON,"SCOPES");
  foundValues.AUTH_METHOD = auth.oauth;
  
  for(let key in foundValues){
    if(foundValues[key]){
      let foundValue = foundValues[key];
      postmanObj = setEnvValue(postmanObj, key, foundValue);
      debugPMEnv(key + " set.");
      authParamCount++;
    } else console.error("Could not find " + key);
  }
  //Verify that all 5 foundValues above are set
  if(authParamCount == 5){
    debugPMEnv(postmanObj);
    return postmanObj;
  }
}

// Returns a Postman Environment json with the correct variables for JWT
function createJWTEnvObjFromConfig(file){
  let fileObj = parserUtil.getFileObj(file);
  let workingDir = parserUtil.getWorkingDir(file);
  let fileContentsJSON = parserUtil.getJSONSync(fileObj);
  if(!fileContentsJSON) return;

  let postmanObj = POSTMAN_ENV;
  let authParamCount = 0; // counter to make sure all auth params are set

  console.log("Looking for auth values in config file...");
  let foundValues = {};
  foundValues.CLIENT_ID = parserUtil.findNestedObj(fileContentsJSON,"API_KEY") || parserUtil.findNestedObj(fileContentsJSON,"CLIENT_ID");
  foundValues.CLIENT_SECRET = parserUtil.findNestedObj(fileContentsJSON,"CLIENT_SECRET");
  foundValues.ORG_ID = parserUtil.findNestedObj(fileContentsJSON,"ORG_ID") || parserUtil.findNestedObj(fileContentsJSON,"IMS_ORG_ID");
  foundValues.TECHNICAL_ACCOUNT_ID = parserUtil.findNestedObj(fileContentsJSON,"TECHNICAL_ACCOUNT_ID") || parserUtil.findNestedObj(fileContentsJSON,"IMS_ORG_ID");
  foundValues.PRIVATE_KEY = parserUtil.findNestedObj(fileContentsJSON,"PRIVATE_KEY");
  foundValues.AUTH_METHOD = auth.jwt;
  
  for(let key in foundValues){
    if(foundValues[key]){
      let foundValue = foundValues[key];
      if(key.includes("PRIVATE_KEY")) foundValue = parserUtil.resolveFileWithContents(foundValue, workingDir, true);
      postmanObj = setEnvValue(postmanObj, key, foundValue);
      debugPMEnv(key + " set.");
      authParamCount++;
    } else console.error("Could not find " + key);
  }
  //Verify that all 6 foundValues above are set
  if(authParamCount == 6){
    debugPMEnv(postmanObj);
    return postmanObj;
  }
}

//Helper method update (or add) a key/value pair to a Postman Environment JSON
function setEnvValue(envObj, key, value){
  envObj = JSON.parse(JSON.stringify(envObj));
  let addVal = true;
  let envVal = {};
  if(envObj && envObj.values){
    for(let i = 0; i < envObj.values.length; i++){
      envVal = envObj.values[i];
      if(envVal.key == key){
        addVal = false;
        envVal.value = value;
        envObj.values[i] = envVal;
        i = envObj.values.length;
      }
    }
    if(addVal){
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
exports.auth = auth;