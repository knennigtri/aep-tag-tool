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

// Returns a Postman Environment json with the correct variables for authentication
function createAuthObj(configYMLFile){
  return new Promise(function(resolve, reject) {
    let configFileObj = createFileObj(configYMLFile);

    getJSON(configFileObj.contents, configFileObj.workingDir)
      .then((resultObj) => {
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
            let privateKey = getPrivateKey(resultObj.auth[key], configFileObj.workingDir);
            postmanObj = setEnvironmentValue(postmanObj, "PRIVATE_KEY", privateKey);
            debugEnv("PRIVATE_KEY set.");
          } else {
            debugEnv(key + " is not valid for auth values. Skipping.");
          }

        }
        debugEnv(postmanObj);
        resolve(postmanObj);
      })
      .catch((err) => {
        console.log(err);
        return;
      });
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

function createLaunchObj(file, authObj){
  debugData(createLaunchObj);
  return new Promise(function(resolve, reject) {
    let dataFileObj = createFileObj(file);
      
    getJSON(dataFileObj.contents)
      .then((resultDataContents) => {
        //add authentication environment
        resultDataContents.environment = authObj || resultDataContents.environment;
        //Make all file paths absolute
        resultDataContents = absPathsUpdate(resultDataContents, dataFileObj.workingDir);
        debugData(resultDataContents);
        resolve(resultDataContents);
      })
      .catch((err) => {
        console.log(err);
        return;
      });

  });
}

function absPathsUpdate(dataObj, dataFileDir){
  debugData(absPathsUpdate);
  
  //Update any relative paths to absolute paths or return the json object
  if(dataObj.import){
    dataObj.import.extensions = getDataItem(dataObj.import.extensions, dataFileDir);
    dataObj.import.dataElements = getDataItem(dataObj.import.dataElements, dataFileDir);
    for (let rule in dataObj.import.rules){
      dataObj.import.rules[rule] = getDataItem(dataObj.import.rules[rule], dataFileDir);
    }
  }
  if(dataObj.environment) dataObj.environment = getDataItem(dataObj.environment, dataFileDir);
  if(dataObj.globals) dataObj.globals = getDataItem(dataObj.globals, dataFileDir);

  return dataObj;
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
function getJSON(dataContents) {
  debugJSON(getJSON);
  let dataObj = {};
  return new Promise(function(resolve, reject) {

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
        reject(new Error("File does not contain valid YAML or JSON content.",{cause: err.name}));
      }
    }

    debugJSON(dataObj);
    resolve(dataObj);
  });
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

exports.debugOptions = debugOptions;
exports.createAuthObj = createAuthObj;
exports.createLaunchObj = createLaunchObj;