const tagTool = require("./index.js");
const fs = require("fs");
const path = require("path");
const debug = require("debug");
const debugIndex = debug("index");

const DEFAULT_AIO_DIR = "../aio-projects";

const OUTPUT_DIR_ENVIRONMENTS = "bin/postman/environments/";
const OUTPUT_DIR_TAGS = "bin/aep/tags";

const DEFAULT_TAG_FILE = "wknd-tag.json";
const DEFAULT_ORG_SETTINGS = "org-settings/";


let aepTagFile = DEFAULT_TAG_FILE;
let aepTagObj = {};
try {
  // Read the file synchronously
  aepTagObj = fs.readFileSync(aepTagFile, "utf8");
  aepTagObj = JSON.parse(aepTagObj);
  console.log("Found " + path.basename(aepTagFile));
} catch (err) {
  console.error("Error reading file:", err);
}
run(DEFAULT_AIO_DIR, aepTagObj, DEFAULT_ORG_SETTINGS).catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

/* Read the contents of a folder and makes an array of 
 postman environment objects from the AIO project JSONs */
async function run(aioFolder, tag, settingsFolder) {
  const aioFilesFolder = aioFolder || DEFAULT_AIO_DIR;
  const envObjs = [];
  const files = fs.readdirSync(aioFilesFolder);
  const jsonFiles = files.filter((file) => path.extname(file).toLowerCase() === ".json");

  for (const fileName of jsonFiles) {
    const filePath = path.join(aioFilesFolder, fileName);
    const stats = fs.statSync(filePath);
    if (!stats.isFile()) {
      continue;
    }

    console.log("AIO Project File:", fileName);
    const envObj = tagTool.createPostmanEnvironment(filePath);
    if (!envObj) {
      console.error("Skipping " + fileName + ": could not build Postman environment");
      continue;
    }
    if (debugIndex.enabled) {
      writeToFile(envObj, path.join(OUTPUT_DIR_ENVIRONMENTS, fileName));
    }

    const orgTag = buildTagForOrg(tag, path.parse(fileName).name, settingsFolder);
    if (!orgTag) {
      console.error("Skipping import for " + fileName + ": invalid tag object");
      continue;
    }

    console.log("Running Newman to import the tag to: " + envObj.name);
    await tagTool.importTag(envObj, orgTag);
    envObjs.push(envObj);
  }

  return envObjs;
}

function buildTagForOrg(tag, orgName, settingsFilesFolder) {
  if(!tag) {
    console.log("Invalid tag object");
    return;
  }
  try {
    // Read the contents of the folder
    const files = fs.readdirSync(settingsFilesFolder);
    console.log("looking for: " + orgName + " in " + settingsFilesFolder);
    const settingsFile = files.find(file => file.includes(orgName));

    let tagObj = tag;
    if (settingsFile) {
      const filePath = path.join(settingsFilesFolder, settingsFile);
      console.log("Applying " +  filePath + " to the base tag");
      tagObj = tagTool.updateTagObjectSettings(tag, filePath);
    } else {
      console.log("No settings file found for: " + orgName);
      console.log("Using base tag with no settings updates.");
    }
    if (debugIndex.enabled) {
      let tagName = (tag.propertyName || "tag").toLowerCase().replace(/\s+/g, "-");
      writeToFile(tagObj, path.join(OUTPUT_DIR_TAGS, orgName + "_" + tagName + ".json"));
    }
    return tagObj;
  } catch (err) {
    console.error("Error reading folder:", err);
  }
}

function writeToFile(json, outputFile) {
  if (!json) return;
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });

  try {
    // Write the JSON string to the file synchronously
    if (typeof json === "object") {
      fs.writeFileSync(outputFile, JSON.stringify(json, null, 2), "utf8");
    } else {
      fs.writeFileSync(outputFile, json, "utf8");
    }

    debugIndex("Output has been written to", outputFile);
  } catch (err) {
    console.error("Error writing to the file:", err);
  }
}
