const parserUtil = require("./parserUtil.js");
const fs = require("fs");
const yaml = require("js-yaml");
const debug = require("debug");
const debugImportObj = debug("import");
const debugNewSettings = debug("import:setting");
const debugConfig = debug("import:config");

const SETTINGS_VAR_SECTIONS = ["settings-vars", "vars"];
const RESOURCE_SECTIONS = ["extensions", "dataElements", "rules"];
const VAR_PATTERN = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

exports.debugOptions = {
  "import": "checks if values have been found/replaces in import object",
  "import:setting": "new settings displayed",
  "import:config": "debug the web property created from the file"
};

function getWebPropertyFromFile(file) {
  debugConfig(getWebPropertyFromFile);
  const fileObj = parserUtil.getFileObj(file);
  const workingDir = parserUtil.getWorkingDir(file);
  const resultDataContents = parserUtil.getJSONSync(fileObj);

  if (resultDataContents) {
    resultDataContents.extensions = parserUtil.resolveFileWithContents(
      resultDataContents.extensions, workingDir, true
    );
    resultDataContents.dataElements = parserUtil.resolveFileWithContents(
      resultDataContents.dataElements, workingDir, true
    );
    for (const rule in resultDataContents.rules) {
      resultDataContents.rules[rule] = parserUtil.resolveFileWithContents(
        resultDataContents.rules[rule], workingDir, true
      );
    }
  }
  debugConfig(resultDataContents);
  return resultDataContents;
}

function loadSettingsYamlDocument(settingsFile) {
  const yamlContent = fs.readFileSync(settingsFile, "utf8");
  const parsedYaml = yaml.loadAll(yamlContent);
  if (!parsedYaml.length || !parsedYaml[0]) {
    throw new Error("Settings file is empty or invalid: " + settingsFile);
  }
  return parsedYaml[0];
}

function parseSettingsYaml(root) {
  const vars = {};
  for (const section of SETTINGS_VAR_SECTIONS) {
    if (root[section] && typeof root[section] === "object") {
      Object.assign(vars, root[section]);
    }
  }

  const replacements = {};
  for (const section of RESOURCE_SECTIONS) {
    if (root[section] && typeof root[section] === "object") {
      replacements[section] = root[section];
    }
  }

  return { vars, replacements };
}

function listVarReferences(value, found) {
  if (typeof value === "string") {
    let match;
    const re = new RegExp(VAR_PATTERN.source, "g");
    while ((match = re.exec(value)) !== null) {
      found.add(match[1]);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry) => listVarReferences(entry, found));
    return;
  }
  if (value && typeof value === "object") {
    Object.values(value).forEach((entry) => listVarReferences(entry, found));
  }
}

function resolveVarsInValue(value, vars) {
  if (typeof value === "string") {
    return value.replace(VAR_PATTERN, (_, name) => {
      if (vars[name] === undefined || vars[name] === null) {
        throw new Error("Unknown settings variable: " + name);
      }
      return String(vars[name]);
    });
  }
  if (Array.isArray(value)) {
    return value.map((entry) => resolveVarsInValue(entry, vars));
  }
  if (value && typeof value === "object") {
    const resolved = {};
    for (const key of Object.keys(value)) {
      resolved[key] = resolveVarsInValue(value[key], vars);
    }
    return resolved;
  }
  return value;
}

function normalizeReplacementMap(rawSettings) {
  const normalized = {};
  for (const key of Object.keys(rawSettings)) {
    const val = rawSettings[key];
    if (val === undefined || val === null) {
      continue;
    }
    normalized[key] = val;
  }
  return normalized;
}

function collectSettingKeys(obj, keys) {
  if (obj === null || obj === undefined) {
    return;
  }
  if (Array.isArray(obj)) {
    obj.forEach((entry) => collectSettingKeys(entry, keys));
    return;
  }
  if (typeof obj === "object") {
    for (const key of Object.keys(obj)) {
      keys.add(key);
      collectSettingKeys(obj[key], keys);
    }
  }
}

function findComponent(importData, tagComponentName, objName) {
  const componentArr = importData[tagComponentName];
  if (!componentArr || !Array.isArray(componentArr)) {
    return null;
  }
  for (const item of componentArr) {
    if (item && item.attributes && item.attributes.name === objName) {
      return item;
    }
  }
  return null;
}

function parseComponentSettings(component) {
  if (!component || !component.attributes || !component.attributes.settings) {
    return {};
  }
  try {
    return JSON.parse(component.attributes.settings);
  } catch {
    return null;
  }
}

function replaceSettings(importData, tagComponentName, objName, newSettings) {
  let data = importData;
  if (typeof importData === "string") {
    debugImportObj("Import Data is of type string, converting to JSON");
    data = JSON.parse(importData);
  }

  const component = findComponent(data, tagComponentName, objName);
  if (!component) {
    debugImportObj("'" + tagComponentName + ":" + objName + "' not found in import json");
    return data;
  }

  debugImportObj("Found '" + tagComponentName + ":" + objName + "'. Replacing old settings.");
  debugNewSettings(newSettings);

  let settings = parseComponentSettings(component);
  if (settings === null) {
    throw new Error(
      "Invalid settings JSON on " + tagComponentName + ":" + objName
    );
  }

  for (const setting of Object.keys(newSettings)) {
    settings = parserUtil.replaceValueInJSON(settings, setting, newSettings[setting]);
  }
  debugNewSettings("Applying to settings JSON:");
  debugNewSettings(settings);
  component.attributes.settings = JSON.stringify(settings);
  return data;
}

function applySettingsDocument(importObj, root) {
  const { vars, replacements } = parseSettingsYaml(root);

  for (const tagResourceName of Object.keys(replacements)) {
    const resourceObjects = replacements[tagResourceName];
    for (const objName of Object.keys(resourceObjects)) {
      const rawBlock = resourceObjects[objName];
      if (!rawBlock || typeof rawBlock !== "object") {
        continue;
      }
      const resolvedBlock = resolveVarsInValue(
        normalizeReplacementMap(rawBlock),
        vars
      );
      importObj = replaceSettings(importObj, tagResourceName, objName, resolvedBlock);
    }
  }
  return importObj;
}

function updateSettings(importObj, newSettingsFile) {
  try {
    const root = loadSettingsYamlDocument(newSettingsFile);
    debugImportObj("Parsing through replacement values");
    importObj = applySettingsDocument(importObj, root);
    if (debugImportObj.enabled) {
      fs.writeFileSync("updatedImport.json", JSON.stringify(importObj));
    }
    return importObj;
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}

function validateSettings(importFile, settingsFile) {
  const result = {
    ok: true,
    errors: [],
    warnings: [],
    matched: []
  };

  let importObj;
  try {
    const fileObj = parserUtil.getFileObj(importFile);
    importObj = parserUtil.getJSONSync(fileObj);
  } catch (error) {
    result.ok = false;
    result.errors.push("Could not load import file: " + error.message);
    return result;
  }

  if (!importObj) {
    result.ok = false;
    result.errors.push("Import file is empty or invalid.");
    return result;
  }

  let root;
  try {
    root = loadSettingsYamlDocument(settingsFile);
  } catch (error) {
    result.ok = false;
    result.errors.push("Could not load settings file: " + error.message);
    return result;
  }

  const { vars, replacements } = parseSettingsYaml(root);
  const referencedVars = new Set();
  for (const section of Object.keys(replacements)) {
    for (const objName of Object.keys(replacements[section])) {
      listVarReferences(replacements[section][objName], referencedVars);
    }
  }

  for (const varName of referencedVars) {
    if (vars[varName] === undefined || vars[varName] === null) {
      result.ok = false;
      result.errors.push(
        "Variable '{{ " + varName + " }}' is not defined under settings-vars."
      );
    }
  }

  for (const varName of Object.keys(vars)) {
    if (vars[varName] === undefined || vars[varName] === null || vars[varName] === "") {
      result.warnings.push("settings-vars." + varName + " is empty.");
    }
  }

  for (const tagResourceName of Object.keys(replacements)) {
    if (!RESOURCE_SECTIONS.includes(tagResourceName)) {
      result.warnings.push("Unknown top-level section: " + tagResourceName);
      continue;
    }

    const resourceObjects = replacements[tagResourceName];
    for (const objName of Object.keys(resourceObjects)) {
      const rawBlock = resourceObjects[objName];
      if (!rawBlock || typeof rawBlock !== "object") {
        result.warnings.push(tagResourceName + "." + objName + " has no settings block.");
        continue;
      }

      const component = findComponent(importObj, tagResourceName, objName);
      if (!component) {
        result.ok = false;
        result.errors.push(
          "No " + tagResourceName + " named \"" + objName + "\" in import file."
        );
        continue;
      }

      const settingsKeys = new Set();
      const parsedSettings = parseComponentSettings(component);
      if (parsedSettings === null) {
        result.ok = false;
        result.errors.push(
          tagResourceName + "." + objName + " has invalid attributes.settings JSON."
        );
        continue;
      }
      collectSettingKeys(parsedSettings, settingsKeys);

      let resolvedBlock;
      try {
        resolvedBlock = resolveVarsInValue(normalizeReplacementMap(rawBlock), vars);
      } catch (error) {
        result.ok = false;
        result.errors.push(tagResourceName + "." + objName + ": " + error.message);
        continue;
      }

      for (const settingKey of Object.keys(rawBlock)) {
        if (rawBlock[settingKey] === undefined || rawBlock[settingKey] === null) {
          result.warnings.push(
            tagResourceName + "." + objName + "." + settingKey + " is empty (skipped on import)."
          );
          continue;
        }
        if (!settingsKeys.has(settingKey)) {
          result.warnings.push(
            tagResourceName + "." + objName + ": key \"" + settingKey +
            "\" not found in export settings (may not apply)."
          );
        }
      }

      result.matched.push({
        section: tagResourceName,
        name: objName,
        keys: Object.keys(resolvedBlock)
      });
    }
  }

  return result;
}

exports.createLaunchObjSync = getWebPropertyFromFile;
exports.updateSettings = updateSettings;
exports.validateSettings = validateSettings;
exports.parseSettingsYaml = parseSettingsYaml;
exports.resolveVarsInValue = resolveVarsInValue;
