const newman = require("./newman.js");
const pmEnv = require("./pmEnvironment.js");
const importObjUtil = require("./importObjectUtil.js");
// const fs = require('fs');
// const path = require("path");
// const csv = require('csv-parser');
const minimist = require("minimist");
const args = minimist(process.argv.slice(2));
//https://www.npmjs.com/package/debug
//Mac: DEBUG=* aep-tag-tool....
//WIN: set DEBUG=* & aep-tag-tool....
const debug = require("debug");
const debugDryRun = debug("dryrun");
const debugArgs = debug("args");
exports.debugOptions = {
  "*": "Output all debugging messages",
  "dryrun": "Run without running postman collections to verify input",
  "args": "See CLI argument messages"
};
const message = require("./message.js");

const modes = {
  export: "export",
  import: "import",
  delete: "delete"
};

async function runTool(authConfig, authMethod, mode, settings) {
  //create AuthObj from config.json
  let authObj = pmEnv.createAuthObj(authConfig, authMethod);
  if (!authObj) {
    console.log("Authentication not properly configured. Make sure your config file has the required Auth values.");
    console.log("Use -h config to learn mode");
    return;
  } else console.log("Auth object successfully created.");

  console.log("Running mode: " + mode);
  try {
    if (mode == modes.export) { //EXPORT
      //optionally change the working directory for export
      const workingDir = args.o || args.output;

      let exportPID = args.export || args.e;
      if (typeof exportPID == ("boolean" || "undefined")) {
        console.log("Export mode must have a property ID specified. See -h export");
        console.log(message.HELP);
        return;
      }

      if (debug.enabled("dryrun")) {
        debugArgs("PID: " + exportPID);
        debugArgs("workingDir: " + workingDir);
      } else {
        newman.exportTag(authObj, exportPID, workingDir, function (err, resultObj) {
          if (err) {
            console.error(err);
            console.log(message.HELP);
          }
          if (resultObj) {
            console.log("Complete. Check logs for any issues.");
          }
        });
      }
    } else if (mode == modes.import) {  //IMPORT
      let newSettings = settings || args.settings || args.s;

      let importPID = args.pid || args.p || "";
      let importTitle = args.title || args.t;

      let propertiesFile = args.import || args.i;
      let propertyObj = {};
      if (typeof propertiesFile == ("boolean" || "undefined")) {
        console.log("Import mode must have at valid property file. See -h import");
        console.log(message.HELP);
        return;
      } else {
        propertyObj = importObjUtil.createLaunchObjSync(propertiesFile);
        propertyObj.propertyName = importTitle || propertyObj.propertyName;
        propertyObj.propID = importPID;
        if (newSettings) {
          propertyObj = await importObjUtil.updateSettings(propertyObj, newSettings);
        }
      }
      // debugDryRun(propertyObj);
      await importProperty(authObj, propertyObj);

    } else if (mode == modes.delete) { //DELETE
      let searchStr = args.delete || args.d;
      if (typeof searchStr == ("boolean" || "undefined")) {
        console.log("Delete mode must have a search string specified. See -h delete");
        console.log(message.HELP);
        return;
      }

      if (debug.enabled("dryrun")) {
        debugArgs("SearchStr: " + searchStr);
      } else {
        newman.deleteTags(authObj, searchStr, function (err, resultObj) {
          if (err) {
            console.error(err);
          }
          if (resultObj) {
            console.log("Complete. Check logs for any issues.");
          }
        });
      }
    } else {
      console.log("No mode selected");
      console.log(message.HELP);
    }
  } catch (error) {
    console.error("Error in runTool:", error);
  }
}

async function importProperty(authObj, propertyObj) {
  if (!propertyObj) {
    console.log("Import mode must have a valid property object. See -h import");
    console.log(message.HELP);
    return;
  }

  console.log("Importing: " + propertyObj.propertyName);
  const actions = newman.getImportActions(args.C, args.E, args.D, args.R, args.L, args.P);

  if (!actions.includes("C")) {
    console.log("A PID (-p) is required when importing without creating a new property");
    console.log("Skipping..");
    return;
  }

  try {
    if (debug.enabled("dryrun")) {
      debugDryRun(
        "PID: " + propertyObj.propID + "\n" +
        "Actions: " + actions
      );
    } else {
      await newman.importTag(authObj, propertyObj, actions, "");
      console.log("Import completed for: " + propertyObj.propertyName);
    }
  } catch (error) {
    console.error("Error importing property:", error);
  }
}

function createPostmanEnvironment(aioProjectFile) {
  return pmEnv.createAuthObj(aioProjectFile);
}

function updateTagObjectSettings(tagObj, settingsFile) {
  return importObjUtil.updateSettings(tagObj, settingsFile);
}

async function importTag(env, importObj) {
  return newman.importTag(env, importObj);
}


exports.importTag = importTag;
exports.createPostmanEnvironment = createPostmanEnvironment;
exports.updateTagObjectSettings = updateTagObjectSettings;
exports.run = runTool;
exports.modes = modes;