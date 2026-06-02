const newman = require("./newman.js");
const pmEnv = require("./pmEnvironment.js");
const importObjUtil = require("./importObjectUtil.js");
const cliOutput = require("./cliOutput.js");
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

function missingRequiredString(value) {
  return typeof value !== "string" || value.trim() === "";
}

async function runTool(authConfig, authMethod, mode, settings) {
  let authObj = pmEnv.createAuthObj(authConfig, authMethod);
  if (!authObj) {
    throw new Error(
      "Authentication not properly configured. Make sure your config file has the required Auth values. Use -h config"
    );
  }
  cliOutput.configOk(authConfig);

  if (!mode) {
    cliOutput.warn("No mode selected (use --export, --import, or --delete)");
    console.log(message.HELP);
    return;
  }

  if (mode === modes.export) {
    const workingDir = args.o || args.output;
    const exportPID = args.export || args.e;
    if (missingRequiredString(exportPID)) {
      cliOutput.error("Export requires a property ID (-e / --export)");
      console.log(message.HELP);
      throw new Error("Export mode requires a property ID (-e / --export)");
    }
    if (debug.enabled("dryrun")) {
      cliOutput.dryRun("export", {
        "Property ID": exportPID,
        "Output folder": workingDir || "."
      });
      debugArgs("PID: " + exportPID);
      debugArgs("workingDir: " + workingDir);
      return;
    }
    cliOutput.exportStart({ pid: exportPID, outputDir: workingDir || "." });
    await newman.exportTag(authObj, exportPID, workingDir);
    return;
  }

  if (mode === modes.import) {
    const newSettings = settings || args.settings || args.s;
    const importPID = args.pid || args.p || "";
    const importTitle = args.title || args.t;
    const propertiesFile = args.import || args.i;

    if (missingRequiredString(propertiesFile)) {
      cliOutput.error("Import requires a property JSON file (-i / --import)");
      console.log(message.HELP);
      throw new Error("Import mode requires a property file (-i / --import)");
    }

    let propertyObj = importObjUtil.createLaunchObjSync(propertiesFile);
    if (!propertyObj) {
      throw new Error("Could not load import property file: " + propertiesFile);
    }
    propertyObj.propertyName = importTitle || propertyObj.propertyName;
    propertyObj.propID = importPID;
    if (newSettings) {
      propertyObj = importObjUtil.updateSettings(propertyObj, newSettings);
      if (!propertyObj) {
        throw new Error("Settings update failed for: " + newSettings);
      }
    }
    await importProperty(authObj, propertyObj, {
      settingsFile: newSettings,
      sourceFile: propertiesFile
    });
    return;
  }

  if (mode === modes.delete) {
    const searchStr = args.delete || args.d;
    if (missingRequiredString(searchStr)) {
      cliOutput.error("Delete requires a search string (-d / --delete)");
      console.log(message.HELP);
      throw new Error("Delete mode requires a search string (-d / --delete)");
    }
    if (debug.enabled("dryrun")) {
      cliOutput.dryRun("delete", { "Name contains": searchStr });
      debugArgs("SearchStr: " + searchStr);
      return;
    }
    cliOutput.deleteStart({ searchStr });
    await newman.deleteTags(authObj, searchStr);
    cliOutput.deleteDone();
    return;
  }

  cliOutput.warn("Unknown mode: " + mode);
  console.log(message.HELP);
}

async function importProperty(authObj, propertyObj, options) {
  options = options || {};
  if (!propertyObj) {
    cliOutput.error("Invalid property object for import");
    console.log(message.HELP);
    throw new Error("Invalid property object for import");
  }

  const actions = newman.getImportActions(args.C, args.E, args.D, args.R, args.L, args.P);

  if (!actions.includes("C") && missingRequiredString(propertyObj.propID)) {
    throw new Error(
      "A PID (-p) is required when importing without creating a new property (-C not in import actions)"
    );
  }

  if (debug.enabled("dryrun")) {
    cliOutput.dryRun("import", {
      Property: propertyObj.propertyName,
      "Property ID": propertyObj.propID || "(new)",
      Steps: cliOutput.formatImportActions(actions)
    });
    debugDryRun(
      "PID: " + propertyObj.propID + "\n" +
      "Actions: " + actions
    );
    return;
  }

  cliOutput.importStart({
    propertyName: propertyObj.propertyName,
    propID: propertyObj.propID,
    settingsFile: options.settingsFile,
    actions,
    actionsLabel: cliOutput.formatImportActions(actions)
  });

  await newman.importTag(authObj, propertyObj, actions, "");
  cliOutput.importDone({
    propertyName: propertyObj.propertyName,
    propID: propertyObj.propID
  });
}

function createPostmanEnvironment(aioProjectFile) {
  return pmEnv.createAuthObj(aioProjectFile);
}

function updateTagObjectSettings(tagObj, settingsFile) {
  return importObjUtil.updateSettings(tagObj, settingsFile);
}

function importTag(env, importObj, actions, globals) {
  return newman.importTag(env, importObj, actions, globals);
}

exports.importTag = importTag;
exports.createPostmanEnvironment = createPostmanEnvironment;
exports.updateTagObjectSettings = updateTagObjectSettings;
exports.run = runTool;
exports.modes = modes;
