const parserUtil = require("./parserUtil.js");
const fs = require('fs').promises;
const yaml = require('js-yaml');
//https://www.npmjs.com/package/debug
//Mac: DEBUG=* aep-tag-tool....
//WIN: set DEBUG=* & aep-tag-tool....
const debug = require("debug");
const debugParser = debug("parser");
const debugNewSettings = debug("new setting");
const debugConfig = require("debug")("config");
exports.debugOptions = {
  "json": "Messages on JSON obj creation from files",
  "property": "messages related to the property file",
  "config": "Messages related to config file"
};

//Get any import properties from the config file
function getWebPropertiesFromConfig(file){
    let fileContents = parserUtil.getFileObj(file);
    let workingDir = parserUtil.getWorkingDir(file);
    let fileContentsJSON = parserUtil.getJSONSync(fileContents);
  
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
        let absStr = resolveFileWithContents(str,workingDir);
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
    let fileObj = parserUtil.getFileObj(file);
    let workingDir = parserUtil.getWorkingDir(file);
        
    let resultDataContents = parserUtil.getJSONSync(fileObj);
  
    //Update any relative paths to absolute paths or return the json object
    if(resultDataContents){
      resultDataContents.extensions = parserUtil.resolveFileWithContents(resultDataContents.extensions, workingDir, true);
      resultDataContents.dataElements = parserUtil.resolveFileWithContents(resultDataContents.dataElements, workingDir, true);
      for (let rule in resultDataContents.rules){
        resultDataContents.rules[rule] = parserUtil.resolveFileWithContents(resultDataContents.rules[rule], workingDir, true);
      }
    }
    debugConfig(resultDataContents);
    return resultDataContents;
  }

  async function updateSettings(importObj, newSettingsFile) {
    try {
        const yamlContent = await fs.readFile(newSettingsFile, 'utf8');
        const parsedYaml = yaml.loadAll(yamlContent);

        debugParser("Parsing through replacement values");
        for (const tagResourceName in parsedYaml[0]) {
            resourceObjects = parsedYaml[0][tagResourceName];
            for (const objName in resourceObjects) {
                const newSettings = resourceObjects[objName];
                const found = replaceSettings(importObj, tagResourceName, objName, newSettings);

                if (!found) {
                    debugParser("'" + tagResourceName + ":" + objName + "' not found in import json");
                }
            }
        }
        return importObj; 
    } catch (error) {
        console.error("Error:", error);
    }
}

// Replaces a settings key/value pair in the objName if present in the importData
function replaceSettings(importData, tagResourceName, objName, newSettings) {
    if (importData[tagResourceName]) {
        for (const key of importData[tagResourceName]) {
            const keyName = key.attributes.name;
            if (keyName === objName) {
                debugParser("Found '" + tagResourceName + ":" + objName + "'. Replacing old settings.");
                debugNewSettings(newSettings);

                const settings = JSON.parse(key.attributes.settings);
                for (const setting in newSettings) {
                    parserUtil.replaceValueInJSON(settings, setting, newSettings[setting]);
                }
                key.attributes.settings = JSON.stringify(settings);
                return true;
            }
        }
    }
    return false;
}


  exports.createLaunchObjSync = getWebPropertyFromFile;
  exports.updateSettings = updateSettings;