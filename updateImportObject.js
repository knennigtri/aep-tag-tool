const fs = require('fs').promises;
const yaml = require('js-yaml');
const debug = require("debug");
const debugParser = debug("parser");
const debugNewSettings = debug("new setting");
const debugReplace = debug("replace");

async function addSettings(importObj, newSettingsFile) {
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
                    replaceValueInJSON(settings, setting, newSettings[setting]);
                }
                key.attributes.settings = JSON.stringify(settings);
                return true;
            }
        }
    }
    return false;
}

// Looks through a json object for a keyToFind and if found, 
// replaces the value with newValue
function replaceValueInJSON(jsonObject, keyToFind, newValue) {
    if (typeof jsonObject !== 'object' || jsonObject === null) {
        return jsonObject;
    }

    if (Array.isArray(jsonObject)) {
        for (let i = 0; i < jsonObject.length; i++) {
            jsonObject[i] = replaceValueInJSON(jsonObject[i], keyToFind, newValue);
        }
    } else {
        for (const key in jsonObject) {
            if (jsonObject.hasOwnProperty(key)) {
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

exports.addSettings = addSettings;