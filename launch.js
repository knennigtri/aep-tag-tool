const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
const debugProperty = require("debug")("property");
const debugJSON = require("debug")("json");
const debugConfig = require("debug")("config");
exports.debugOptions = {
  "json": "Messages on JSON obj creation from files",
  "property": "messages related to the property file",
  "config": "Messages related to config file"
};
const POSTMAN_ENV = require("./postman/aep-tag-tool.postman_environment.json");

// Returns a Postman Environment json with the correct variables for authentication
function createAuthObjFromConfig(file){
  let fileContentsAndWorkingDir = createFileObj(file);
  let fileContentsJSON = getJSONSync(fileContentsAndWorkingDir.contents);
  if(!fileContentsJSON) return;

  let postmanObj = POSTMAN_ENV;
  let authParamCount = 0; // counter to make sure all auth params are set

  console.log("Looking for auth values in config file...");
  let foundValues = {};
  foundValues.API_KEY = findNestedObj(fileContentsJSON,"API_KEY") || findNestedObj(fileContentsJSON,"CLIENT_ID");
  foundValues.CLIENT_SECRET = findNestedObj(fileContentsJSON,"CLIENT_SECRET");
  foundValues.ORG_ID = findNestedObj(fileContentsJSON,"ORG_ID") || findNestedObj(fileContentsJSON,"IMS_ORG_ID");
  foundValues.TECHNICAL_ACCOUNT_ID = findNestedObj(fileContentsJSON,"TECHNICAL_ACCOUNT_ID") || findNestedObj(fileContentsJSON,"IMS_ORG_ID");
  foundValues.PRIVATE_KEY = findNestedObj(fileContentsJSON,"PRIVATE_KEY");
  
  for(let key in foundValues){
    if(foundValues[key]){
      let foundValue = foundValues[key];
      if(key.includes("PRIVATE_KEY")) foundValue = resolveFileWithContents(foundValue, fileContentsAndWorkingDir.workingDir, true);
      postmanObj = setPostmanEnvironmentValue(postmanObj, key, foundValue);
      debugConfig(key + " set.");
      authParamCount++;
    } else console.error("Could not find " + key);
  }
  //Verify that all 5 auth params have been found and set
  if(authParamCount == 5){
    debugConfig(postmanObj);
    return postmanObj;
  }
}

//Get any import properties from the config file
function getWebPropertiesFromConfig(file){
  let fileContentsAndWorkingDir = createFileObj(file);
  let fileContentsJSON = getJSONSync(fileContentsAndWorkingDir.contents);

  console.log(fileContentsJSON);
  let importsFound = findNestedObj(fileContentsJSON,"IMPORT");

  let properties = {};
  if(typeof importsFound == "string"){ //parse the string of files into a JSON
    importsFound = importsFound.split(" ");
  }
  if(Array.isArray(importsFound)){
    for(let i in importsFound){
      properties[importsFound[i]] = "";
    }
  } else properties = importsFound; //set the json

  //update any file paths absolute
  if(properties) {
    for(let str in properties){
      let absStr = resolveFileWithContents(str,fileContentsAndWorkingDir.workingDir);
      if(absStr != str){
        properties[absStr] = properties[str];
        delete properties[str];
      }
    }

    debugConfig(properties);
    return(properties);
  }
  return "";
}

//Create an web property import object from a file
function getWebPropertyFromFile(file){
  debugConfig(getWebPropertyFromFile);
  let dataFileObj = createFileObj(file);
      
  let resultDataContents = getJSONSync(dataFileObj.contents);

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

//Helper method to either return the absPath or the contents of the file
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

//Helper method update (or add) a key/value pair to a Postman Environment JSON
function setPostmanEnvironmentValue(envObj, key, value){
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

//helper method to get the file contents and working directory of the file
// {
//   contents: <contents of file>
//   workingDir: <dir of file>
// }
function createFileObj(file){
  debugProperty(createFileObj);
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

exports.setEnvironmentValue = setPostmanEnvironmentValue;
exports.createAuthObjSync = createAuthObjFromConfig;
exports.createLaunchObjSync = getWebPropertyFromFile;
exports.getPropertiesFromConfig = getWebPropertiesFromConfig;