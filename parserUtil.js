const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
const debug = require("debug");
const debugJSON = debug("json");
const debugReplace = debug("replace");
const debugProperty = debug("property");
const debugConfig = debug("config");
exports.debugOptions = {
  "json": "Messages on JSON obj creation from files",
  "replace": "Messages on key/value replacement"
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
      if (Object.prototype.hasOwnProperty.call(key)) {
        if (key === keyToFind) {
          debugReplace("Found key '" + keyToFind + "' with value '" + jsonObject[key] + "' and replacing with '" + newValue + "'");
          jsonObject[key] = newValue;
        } else {
          jsonObject[key] = replaceValueInJSON(jsonObject[key], keyToFind, newValue);
        }
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
  debugProperty(getFileObjAndWorkingDir);
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
      debugConfig("Found: " + keyToFind);
      foundValue = curVal;
    }
    return curVal;
  });
  return foundValue;
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
exports.resolveFileWithContents = resolveFileWithContents;
exports.getFileObj = getFileObj;
exports.getWorkingDir = getWorkingDir;