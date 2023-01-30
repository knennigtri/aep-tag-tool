const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
const debug = require("debug");
const debugData = require("debug")("data");
const debugJSON = require("debug")("json");
const debugConfig = require("debug")("config");
exports.debugOptions = {
  "json": "Messages on JSON obj creation from files",
  "data": "Data messages for full json object",
  "env": "Messages related to the postman environment object"
};
const POSTMAN_ENV = require("./postman/aep-tag-tool.postman_environment.json");

function createAuthObjSync(ymlFile){
  let configObj = createFileObj(ymlFile);

  let resultObj = getJSONSync(configObj.contents);

  //TODO support with or without auth object. JWT downloads won't have an auth object
  if(!resultObj || !resultObj.auth) reject(new Error("config file doesn't have auth info"));
  let postmanObj = POSTMAN_ENV;

  for(let key in resultObj.auth){
    postmanObj = setEnvironmentValue(postmanObj, key, resultObj.auth[key]);
    let normalizedKey = key.toUpperCase().replace("-","_").replace(" ","_");
    if(normalizedKey.includes("API_KEY") || normalizedKey.includes("CLIENT_ID")){
      postmanObj = setEnvironmentValue(postmanObj, "API_KEY", resultObj.auth[key]);
      debugConfig("API_KEY set.");
    } else if(normalizedKey.includes("CLIENT_SECRET")){
      postmanObj = setEnvironmentValue(postmanObj, "CLIENT_SECRET", resultObj.auth[key]);
      debugConfig("CLIENT_SECRET set.");
    } else if(normalizedKey.includes("ORG_ID")){
      postmanObj = setEnvironmentValue(postmanObj, "ORG_ID", resultObj.auth[key]);
      debugConfig("ORG_ID set.");
    } else if(normalizedKey.includes("TECHNICAL_ACCOUNT_ID") || normalizedKey.includes("TECHNICAL_ACCOUNT")){
      postmanObj = setEnvironmentValue(postmanObj, "TECHNICAL_ACCOUNT_ID", resultObj.auth[key]);
      debugConfig("TECHNICAL_ACCOUNT_ID set.");
    } else if(normalizedKey.includes("PRIVATE_KEY")){
      let privateKey = resolveFileWithContents(resultObj.auth[key], configObj.workingDir, true);
      postmanObj = setEnvironmentValue(postmanObj, "PRIVATE_KEY", privateKey);
      debugConfig("PRIVATE_KEY set.");
    } else {
      debugConfig(key + " is not valid for auth values. Skipping.");
    }

  }
  debugConfig(postmanObj);
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

//Get any import properties from the config file
function getPropertiesFromConfig(ymlFile){
  let configObj = createFileObj(ymlFile);
  let resultObj = getJSONSync(configObj.contents);

  let properties = {};
  if(typeof resultObj.import == "string"){ //parse the string of files into a JSON
    let arr = resultObj.import.split(" ")
    for(i in arr){
      properties[arr[i]] = "";
    }
  } else properties = resultObj.import; //set the json

  //update any file paths absolute
  if(properties) {
    for(let str in properties){
      absStr = resolveFileWithContents(str,configObj.workingDir);
      properties[absStr] = properties[str];
      delete properties[str];
    }

    debugConfig(properties)
    return(properties);
  }
  
  return "";
}

function createPropertyObjSync(file){
  debugConfig(createPropertyObjSync);
  let dataFileObj = createFileObj(file);
      
  let resultDataContents = getJSONSync(dataFileObj.contents)

  //Update any relative paths to absolute paths or return the json object
  if(resultDataContents){
    resultDataContents.extensions = resolveFileWithContents(resultDataContents.extensions, dataFileObj.workingDir, true);
    resultDataContents.dataElements = resolveFileWithContents(resultDataContents.dataElements, dataFileObj.workingDir, true);
    for (let rule in resultDataContents.rules){
      resultDataContents.rules[rule] = resolveFileWithContents(resultDataContents.rules[rule], dataFileObj.workingDir, true);
    }
  }

  debugConfig(resultDataContents);
  return resultDataContents;

}

function createPropertyObj(file){
  return new Promise(function(resolve, reject) {
    let propertyContents = createPropertyObjSync(file);
    if(propertyContents) resolve(propertyContents)
    else reject(new Error("Could not create launch object"));
  });
}

//used to extract private.key from file
//used to create absFile paths
function resolveFileWithContents(val, workingDir, extractContents) {
  if(typeof val == "string"){
    let contents = path.resolve(workingDir,val);
    if(fs.lstatSync(contents).isFile() && extractContents){
      contents = fs.readFileSync(contents, "utf8");
      contents = contents.replace(/\n/g,"");
    }
    return contents;
  } else
   return val;
}

// function getPropertyItem(item, rootDir){
//   if(typeof item == "string"){
//     let absPath = path.resolve(rootDir, item);
//     if(fs.existsSync(absPath)){
//       debugData("Using path:" +absPath);
//       return absPath;
//     } else {
//       throw new Error("Cannot Read File: " + absPath);
//     }
//   } else {
//     return item;
//   }
// }

// // Takes in a file string and returns the contents of the file without line returns \n
// function getPrivateKey(str, workingDir){
//   let contents;
//   if(typeof str == "string"){
//     str = path.resolve(workingDir,str);
//     if(fs.lstatSync(str).isFile()){
//       contents = fs.readFileSync(str, "utf8");
//       contents = contents.replace(/\n/g,"");
//       return contents;
//     } else {
//       return str;
//     }
//   } else return;
// }

// Returns a json object of the contents given
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

exports.setEnvironmentValue = setEnvironmentValue;
exports.createAuthObj = createAuthObj;
exports.createAuthObjSync = createAuthObjSync;
exports.createLaunchObj = createPropertyObj;
exports.createLaunchObjSync = createPropertyObjSync;
exports.getPropertiesFromConfig = getPropertiesFromConfig;