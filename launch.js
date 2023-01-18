const fs = require("fs");
var path = require("path");
const yaml = require("js-yaml");
const debug = require("debug");
const debugData = require("debug")("data");
const debugJSON = require("debug")("json");
const debugEnv = require("debug")("env");
const debugOptions = {
  "json": "Messages on JSON obj creation from files",
  "data": "Data messages for full json object",
  "env": "Messages related to the postman environment object"
};
const POSTMAN_ENV = require("./postman/aep-tag-tool.postman_environment.json");

function createAuthObjSync(ymlFile){
  let configObj = createFileObj(ymlFile);

  let resultObj = getJSONSync(configObj.contents);

  if(!resultObj || !resultObj.auth) reject(new Error("config file doesn't have auth info"));
  let postmanObj = POSTMAN_ENV;

  for(let key in resultObj.auth){
    postmanObj = setEnvironmentValue(postmanObj, key, resultObj.auth[key]);
    let normalizedKey = key.toUpperCase().replace("-","_").replace(" ","_");
    if(normalizedKey.includes("CLIENT_ID")){
      postmanObj = setEnvironmentValue(postmanObj, "CLIENT_ID", resultObj.auth[key]);
      debugEnv("CLIENT_ID set.");
    } else if(normalizedKey.includes("CLIENT_SECRET")){
      postmanObj = setEnvironmentValue(postmanObj, "CLIENT_SECRET", resultObj.auth[key]);
      debugEnv("CLIENT_SECRET set.");
    } else if(normalizedKey.includes("ORG_ID")){
      postmanObj = setEnvironmentValue(postmanObj, "ORG_ID", resultObj.auth[key]);
      debugEnv("ORG_ID set.");
    } else if(normalizedKey.includes("TECHNICAL_ACCOUNT")){
      postmanObj = setEnvironmentValue(postmanObj, "TECHNICAL_ACCOUNT", resultObj.auth[key]);
      debugEnv("TECHNICAL_ACCOUNT set.");
    } else if(normalizedKey.includes("PRIVATE_KEY")){
      let privateKey = getPrivateKey(resultObj.auth[key], configObj.workingDir);
      postmanObj = setEnvironmentValue(postmanObj, "PRIVATE_KEY", privateKey);
      debugEnv("PRIVATE_KEY set.");
    } else {
      debugEnv(key + " is not valid for auth values. Skipping.");
    }

  }
  debugEnv(postmanObj);
  return postmanObj;
}

// Returns a Postman Environment json with the correct variables for authentication
function createAuthObj(configYMLFile){
  return new Promise(function(resolve, reject) {
    let postmanEnv = createAuthObjSync(ymlFile);
    if(postmanEnv) resolve(postmanEnv)
    else reject(new Error("Could not create a postman environment with yaml given"));
  });
}

// Takes in a file string and returns the contents of the file without line returns \n
function getPrivateKey(str, workingDir){
  let contents;
  if(typeof str == "string"){
    str = path.resolve(workingDir,str);
    if(fs.lstatSync(str).isFile()){
      contents = fs.readFileSync(str, "utf8");
      contents = contents.replace(/\n/g,"");
      return contents;
    } else {
      return str;
    }
  } else return;
}

function createLaunchObjSync(file){
  debugData(createLaunchObjSync);
  let dataFileObj = createFileObj(file);
      
  let resultDataContents = getJSONSync(dataFileObj.contents)

  //Update any relative paths to absolute paths or return the json object
  if(resultDataContents){
    resultDataContents.extensions = getDataItem(resultDataContents.extensions, dataFileObj.workingDir);
    resultDataContents.dataElements = getDataItem(resultDataContents.dataElements, dataFileObj.workingDir);
    for (let rule in resultDataContents.rules){
      resultDataContents.rules[rule] = getDataItem(resultDataContents.rules[rule], dataFileObj.workingDir);
    }
  }

  debugData(resultDataContents);
  return resultDataContents;

}

function createLaunchObj(file){
  return new Promise(function(resolve, reject) {
    let dataContents = createLaunchObjSync(file);
    if(dataContents) resolve(dataContents)
    else reject(new Error("Could not create launch object"));
  });
}

function getDataItem(data, rootDir){
  if(typeof data == "string"){
    let absPath = path.resolve(rootDir, data);
    if(fs.existsSync(absPath)){
      debugData("Using path:" +absPath);
      return absPath;
    } else {
      throw new Error("Cannot Read File: " + absPath);
    }
  } else {
    return data;
  }
}

// Returns a json object of the contents given
function getJSONSync(dataContents){
  debugJSON(getJSONSync);
  let dataObj = {};
  // Parse the dataContents from YAML or JSON
  try {
    //Attempt to read the YAML and output JSON
    let data = yaml.loadAll(dataContents,"json");
    let yamlContents = JSON.stringify(data[0], null, 2);
    dataObj = JSON.parse(yamlContents);
  } catch {
    console.log("Could not read YAML, attemping JSON...");
    try {
      //Attempt to read JSON
      dataObj = JSON.parse(dataContents);
    } catch(err){
      new Error("File does not contain valid YAML or JSON content.",{cause: err.name});
    }
  }

  debugJSON(dataObj);
  return dataObj;
}

function setEnvironmentValue(envObj, key, value){
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

function createFileObj(file){
  debugData(createFileObj);
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

exports.debugOptions = debugOptions;
exports.setEnvironmentValue = setEnvironmentValue;
exports.createAuthObj = createAuthObj;
exports.createAuthObjSync = createAuthObjSync;
exports.createLaunchObj = createLaunchObj;
exports.createLaunchObjSync = createLaunchObjSync;