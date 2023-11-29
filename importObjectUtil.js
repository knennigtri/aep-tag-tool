const parserUtil = require("./parserUtil.js");
const fs = require("fs");
const yaml = require("js-yaml");
//https://www.npmjs.com/package/debug
//Mac: DEBUG=* aep-tag-tool....
//WIN: set DEBUG=* & aep-tag-tool....
const debug = require("debug");
const debugImportObj = debug("import");
const debugNewSettings = debug("import:setting");
const debugConfig = debug("import:config");
exports.debugOptions = {
  "import": "checks if values have been found/replaces in import object",
  "import:setting": "new settings displayed",
  "import:config": "debug the web property created from the file"
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

function updateSettings(importObj, newSettingsFile) {
  try {
    const yamlContent = fs.readFileSync(newSettingsFile, "utf8");
    const parsedYaml = yaml.loadAll(yamlContent);

    debugImportObj("Parsing through replacement values");
    for (const tagResourceName in parsedYaml[0]) {
      const resourceObjects = parsedYaml[0][tagResourceName];
      for (const objName in resourceObjects) {
        const newSettings = resourceObjects[objName];
        importObj = replaceSettings(importObj, tagResourceName, objName, newSettings);
      }
    }
    if(debugImportObj.enabled) fs.writeFileSync("updatedImport.json", JSON.stringify(importObj));
    return importObj; 
  } catch (error) {
    console.error("Error:", error);
  }
}

// Replaces a settings key/value pair in the objName if present in the importData
function replaceSettings(importData, tagComponentName, objName, newSettings) {
  let data = importData;
  if(typeof importData === "string"){
    debugImportObj("Import Data is of type string, converting to JSON")
    data = JSON.parse(importData);
  }
  let componentArr = data[tagComponentName];
  if (componentArr) {
    for (const key of componentArr) {
      const keyName = key.attributes.name;
      if (keyName === objName) {
        debugImportObj("Found '" + tagComponentName + ":" + objName + "'. Replacing old settings.");
        debugNewSettings(newSettings);

        let settings = JSON.parse(key.attributes.settings);
        for (const setting in newSettings) {
          settings = parserUtil.replaceValueInJSON(settings, setting, newSettings[setting]);
        }
        debugNewSettings("Applying to settings JSON:");
        debugNewSettings(settings);
        key.attributes.settings = JSON.stringify(settings);
        return data;
      }
    }
  }
  debugImportObj("'" + tagComponentName + ":" + objName + "' not found in import json");
  return data;
}


exports.createLaunchObjSync = getWebPropertyFromFile;
exports.updateSettings = updateSettings;