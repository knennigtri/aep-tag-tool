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
run(DEFAULT_AIO_DIR, aepTagObj, DEFAULT_ORG_SETTINGS);

/* Read the contents of a folder and makes an array of 
 postman environment objects from the AIO project JSONs */
function run(aioFolder, tag, settingsFolder) {
  const aioFilesFolder = aioFolder || DEFAULT_AIO_DIR;
  let envObjs = [];
  try {
    const files = fs.readdirSync(aioFilesFolder);
    let jsonFiles = files.filter((file) => path.extname(file).toLowerCase() === ".json");
    jsonFiles.forEach((fileName) => {
      // Construct the full path of the file
      const filePath = path.join(aioFilesFolder, fileName);
      try {
        const stats = fs.statSync(filePath);
        if (stats.isFile()) {
          console.log("AIO Project File:", fileName);
          let envObj = tagTool.createPostmanEnvironment(filePath);
          if (debugIndex.enabled) writeToFile(envObj, path.join(OUTPUT_DIR_ENVIRONMENTS, fileName));

          // Update tag settings based on Org specific settings file
          let orgTag = buildTagForOrg(tag, path.parse(fileName).name, settingsFolder);

          (async () => {
            console.log("Running Newman to import the tag to: " + envObj.name);
            try {
              await tagTool.importTag(envObj, orgTag);
            } catch (error) {
              console.error("async didn't work");
            }
          })();

        }
      } catch (statErr) {
        console.error("Error getting file stats:", statErr);
      }
    });
  } catch (err) {
    console.error("Error reading folder:", err);
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
