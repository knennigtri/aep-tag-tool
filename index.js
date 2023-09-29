const newman = require("./newman.js");
const pmEnv = require("./pmEnvironment.js");
const importObjUtil = require("./importObjectUtil.js");
const packageInfo = require("./package.json");
const fs = require('fs');
const path = require("path");
const csv = require('csv-parser');
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

async function init(){
  let mode = "";
  if(args.export || args.e) mode = modes.export;
  if(args.import || args.i) mode = modes.import;
  if(args.delete || args.d) mode = modes.delete;
  let argsEnv = args.config || args.c;
  let argsAuth = pmEnv.auth.oauth; //default is oauth
  if(args.jwt) argsAuth = pmEnv.auth.jwt;
  if(args.oauth) argsAuth = pmEnv.auth.oauth;
  
  const argsVersion = args.v || args.version;
  const argsHelp =  args.h || args.help;

  debugArgs(JSON.stringify(args,null,2));
  
  // Show CLI help
  if (argsHelp) {
    if(argsHelp == true){
      console.log(message.HELP);
    } else {
      if(argsHelp.toLowerCase() == "config") console.log(message.CONFIGFILE_EXAMPLE);
      if(argsHelp.toLowerCase() == "export") console.log(message.HELP_EXPORT);
      if(argsHelp.toLowerCase() == "import") console.log(message.HELP_IMPORT);
      if(argsHelp.toLowerCase() == "delete") console.log(message.HELP_DELETE);
      if(argsHelp.toLowerCase() == "settings") console.log(message.HELP_SETTINGS);
      if(argsHelp.toLowerCase() == "debug") console.log(message.HELP_DEBUG);
    }
    return;
  }

  // Show version
  if (argsVersion) {
    console.log(packageInfo.version);
    return;
  }

  /** All Modes require an environment */
  if(!argsEnv){
    console.log("No environment Specified.");
    console.log(message.HELP);
    return;
  }
  
  //TODO Allow for a config.csv which contains many oauth.json files
  // aep-tag-tool -c ./myCSV.csv --import ./myproperty.json
  // aep-tag-tool -c ./myCSV.csv --delete "2023"
  if(path.extname(argsEnv) == ".csv"){
  fs.createReadStream(argsEnv)
    .pipe(csv())
    .on('data', async (row) => {
      console.log(row)
      await runTool(row.config,argsAuth, mode, row.settings);
    })
    .on('end', () => {
      // All rows have been parsed, and data now contains objects with headers as keys
      console.log("DONE");
    });
  } else {
    await runTool(argsEnv, argsAuth, mode);
  }
}

async function runTool(authConfig, authMethod, mode, settings){
  //create AuthObj from config.json
  let authObj = pmEnv.createAuthObj(authConfig, authMethod);
  if(!authObj) {
    console.log("Authentication not properly configured. Make sure your config file has the required Auth values.");
    console.log("Use -h config to learn mode");
    return;
  } else console.log("Auth object successfully created.");
  
  console.log("Running mode: " + mode);
  try {
    if(mode == modes.export){ //EXPORT
      //optionally change the working directory for export
      const workingDir = args.o || args.output;

      let exportPID = args.export || args.e;
      if(typeof exportPID == ("boolean" || "undefined")) {
        console.log("Export mode must have a property ID specified. See -h export");
        console.log(message.HELP);
        return;
      }
      
      if(debug.enabled("dryrun")){
        debugArgs("PID: " + exportPID);
        debugArgs("workingDir: " + workingDir);
      } else {
        newman.exportTag(authObj, exportPID, workingDir, function(err, resultObj){
          if(err){
            console.error(err);
            console.log(message.HELP);
          }
          if(resultObj) {
            console.log("Complete. Check logs for any issues.");
          }
        });
      }
    } else if(mode == modes.import){  //IMPORT
      let newSettings = settings || args.settings || args.s;
      
      let importPID = args.pid || args.p || "";
      let importTitle = args.title || args.t;

      let propertiesFile = args.import || args.i;
      let propertyObj = {};
      if(typeof propertiesFile == ("boolean" || "undefined")) {
        console.log("Import mode must have at valid property file. See -h import");
        console.log(message.HELP);
        return;
      } else {
        propertyObj = importObjUtil.createLaunchObjSync(propertiesFile);
        propertyObj.propertyName = importTitle || propertyObj.propertyName;
        propertyObj.propID = importPID;
        if(newSettings){
          propertyObj = await importObjUtil.updateSettings(propertyObj, newSettings);
        }
      }
      // debugDryRun(propertyObj);
      await importProperty(authObj, propertyObj)
      
    } else if(mode == modes.delete){ //DELETE
      let searchStr = args.delete || args.d;
      if(typeof searchStr == ("boolean" || "undefined")){
        console.log("Delete mode must have a search string specified. See -h delete");
        console.log(message.HELP);
        return;
      }
      
      if(debug.enabled("dryrun")){
        debugArgs("SearchStr: " + searchStr);
      } else {
        newman.deleteTags(authObj, searchStr, function(err, resultObj){
          if(err){
            console.error(err);
          }
          if(resultObj) {
            console.log("Complete. Check logs for any issues.");
          }
        });
      }
    } else {
      console.log("No mode selected");
      console.log(message.HELP);
    }
  } catch (error) {
    console.error('Error in runTool:', error);
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
    console.error('Error importing property:', error);
  }
}


exports.run = init;
exports.modes = modes;