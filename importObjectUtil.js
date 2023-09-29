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