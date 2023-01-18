const newman = require("./newman.js");
const config = require("./launch.js");
var packageInfo = require("./package.json");
const yaml = require("js-yaml");
const fs = require("fs");
var minimist = require("minimist");
var args = minimist(process.argv.slice(2));
var path = require("path");
//https://www.npmjs.com/package/debug
var debug = require("debug");
var debugDryRun = require("debug")("dryrun");
var debugConfig = require("debug")("config");
var debugData = require("debug")("data");
var debugArgs = require("debug")("args");
const debugOptions = {
  "*": "Output all debugging messages",
  "dryrun": "Run without running postman collections to verify input",
  "config": "Config messages for connecting to Adobe IO",
  "data": "Data messages for full json object",
  "args": "See CLI argument messages"
};

const modes = {
  export: "export",
  import: "import",
  delete: "delete"
};

const HELP_F = "-f  <file>                      configuration file [json | yml]. See -h configFile" ;
const HELP_E = "-e  <postman_environment.json>  specify an environment file";
const HELP_P = "-p, --pid  <pid>                property ID. Req for export mode";
const HELP_S = "-s, --search  <str>             search string for properties to delete. Reg for delete mode";
const HELP_CEDRLP = "-C,-E,-D,-R,-L,-P          Options to partially import. See -h import";
const MSG_HELP = "Usage: "+ packageInfo.name.replace("@knennigtri/", "") + ` [ARGS]
 Arguments:
    --export                        Mode to export a given property ID
    --import                        Mode to import a property given a config file
    ` + HELP_CEDRLP + `
    --delete                        Mode to delete properties containing a specific string
    ` + HELP_F + `
    ` + HELP_E + `
    -g  <postman_globals.json>      specify a global file
    ` + HELP_P + `
    ` + HELP_S + `
    -h, --help
               configfile           config file format
               export               how to use export mode
               import               how to use import mode
               delete               how to use delete mode
               debug                how to use debug
    -v, --version                   Displays version of this package
 `;
const CONFIGFILE_EXAMPLE = 
 `---
 globals: postman-globals.json
 environment: postman_environment.json
 propID: PR123455678901234556789012345567890
 delete:
   searchStr: 2022-08
 import:
   propertyName: Venia2
   extensions: object | string.json
   dataElements: object | string.json
   rules:
     "RuleTitle": object | string.json
     "RuleTitle": object | string.json
     "RuleTitle": object | string.json
     "RuleTitle": object | string.json
  ---`;
const MSG_HELP_CONFIGFILE = `Create the config file: 
 Option 1: `+ packageInfo.name.replace("@knennigtri/", "") + ` --export -e <environmentFile> --p <pid>
  Automatically creates the config file and adds the export objects
 Option 2: Manually create the file.[yml | json]
  `+CONFIGFILE_EXAMPLE+`
 `;
const MSG_HELP_EXPORT = `Export mode requires:
 ` + HELP_E + `
 ` + HELP_P + `
 
 These values can alternatively be set in the config file:
   configFile.environment
   configfile.propID
`;
const MSG_HELP_IMPORT = `Import mode requires:
 ` + HELP_E + `
 ` + HELP_F + `

The config file requires:
  configFile.import.propName
  configFile.import.extensions
  configFile.import.dataElements
  configFile.import.rules.[rules]

You can specify exactly what you want to create/import with these params. 
No matter the parameter order, they will always execute in the order below.
  -C  Creates a new property. configFile.import.propertyName is optional.

If -C is not used with the remaining parameters, propID is required.
  -E  Imports extensions. configFile.import.extensions is required.
  -D  Imports data elements. configFile.import.dataElement is required.
  -R  Imports rule components. configFile.import.rules.[rules] is required.
  -L  Builds a library of all items the Dev environment
  -P  Publishes the library into Prod
  `;
const MSG_HELP_DELETE = `Delete mode requires:
 ` + HELP_E + `
 ` + HELP_S + `
  
  These values can alternatively be set in the config file:
    configFile.environment
    configfile.delete.searchStr
 
    `;
const MSG_HELP_DEBUG = `Debug options:
  Mac:
    $ DEBUG=<value> aep-tag-tool....
  Win:
    $ set DEBUG=<value> & aep-tag-tool...

  Where <value> can be:
`+
    JSON.stringify(debugOptions, null, 2)
     .replaceAll("\": ","     >")
     .replaceAll("\"","")
     .replaceAll(",","")
     .replaceAll("{\n","")
     .replaceAll("}","")
  + JSON.stringify(newman.debugOptions, null, 2)
     .replaceAll("\": ","     >")   
     .replaceAll("\"","")
     .replaceAll(",","")
     .replaceAll("{\n","")
     .replaceAll("}","")
  + JSON.stringify(convert-configs.debugOptions, null, 2)
     .replaceAll("\": ","     >")   
     .replaceAll("\"","")
     .replaceAll(",","")
     .replaceAll("{\n","")
     .replaceAll("}","")
    ;

function init(mode, dataParam, envParam, globalsParam, pidParam, searchStrParam){
  let data = dataParam || args.f;
  let argsEnv = envParam || args.e;
  let argsGlobals = globalsParam || args.g;
  const argsPID = pidParam || args.p || args.pid;
  const argsSearch = searchStrParam || args.s || args.search;
  const argsVersion = args.v || args.version;
  const argsHelp =  args.h || args.help;
  

  //TODO
  // argsEnv = getDataItem(argsEnv, "./");
  // argsGlobals = getDataItem(argsGlobals, "./");
  


  // Show CLI help
  if (argsHelp) {
    //TODO Add -CEDRLP
    if(argsHelp == true){
      console.log(MSG_HELP);
    } else {
      if(argsHelp.toLowerCase() == "configfile") console.log(MSG_HELP_CONFIGFILE);
      if(argsHelp.toLowerCase() == "export") console.log(MSG_HELP_EXPORT);
      if(argsHelp.toLowerCase() == "import") console.log(MSG_HELP_IMPORT);
      if(argsHelp.toLowerCase() == "delete") console.log(MSG_HELP_DELETE);
      if(argsHelp.toLowerCase() == "debug") console.log(MSG_HELP_DEBUG);
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
    console.log(MSG_HELP);
    return;
  }

  // let configObj;
  config.createAuthObj(argsEnv)
    .then((resultAuthObj) => config.createLaunchObj(data, resultAuthObj))
    .then((resultDataObj) => addParamsToDataObj(resultDataObj, argsPID, argsSearch))
    .then((resultDataObj) => {
      //Dry Run exit
      debugDryRun(JSON.stringify(resultDataObj, null, 2));
      if(debug.enabled("dryrun")){
        return;
      }

      //Run tool
      if((mode && mode.toLowerCase() == modes.export) ||  args.export){
        runAEPTagTool(resultDataObj, modes.export, "./");
      } else if((mode && mode.toLowerCase() == modes.import) ||  args.import){
        runAEPTagTool(resultDataObj, modes.import, "", getArgActions(args));
      } else if((mode && mode.toLowerCase() == modes.delete) ||  args.delete){
        runAEPTagTool(resultDataObj, modes.delete);
      }
    })
    .catch((err) => {
      console.log(err);
      console.log(MSG_HELP); 
      return;
    });

}

function runAEPTagTool(dataObj, mode, workingDir, actions){    
  //Export Mode
  //requires pid (cli -p, --pid | file.propID)
  if(mode == modes.export){
    if(!dataObj.propID){
      console.log("Export mode must have a property ID specified");
      console.log(MSG_HELP);
      return;
    }
    console.log("PropID: "+dataObj.propID);
    newman.exportTag(dataObj, workingDir, function(err, resultObj){
      if(err){
        console.error(err);
        console.log(MSG_HELP);
      }
      if(resultObj) {
        console.log("Complete. Check logs for any issues.");
      }
    });

    //IMPORT mode
    //Requires -f, --file
    // file.propertyName
    // file.extensions
    // file.dataElements
    // file.rules.{rule1, rule2}
  } else if(mode == modes.import){ // IMPORT mode
    if(!dataObj){
      console.log("Configuration file/object is missing for import");
      console.log(MSG_HELP);
      return;
    }
    if(!dataObj.import){
      console.log("Import mode is missing values to import");
      console.log(MSG_HELP);
      return;
    }
    newman.importTag(dataObj, actions, function(err, resultObj){
      if(err){
        console.error(err);
        console.log(MSG_HELP);
      }
      if(resultObj) {
        console.log("Complete. Check logs for any issues.");
      }
    });
    
    //DELETE mode
    //Requires searchStr (cli -s, --search | file.delete.searchStr)
  } else if(mode == modes.delete){
    if(!dataObj.delete || !dataObj.delete.searchStr){
      console.log("Delete mode must have a search string specified");
      console.log(MSG_HELP);
      return;
    }
    console.log("SearchStr: " + dataObj.delete.searchStr);
    newman.deleteTags(dataObj, dataObj.delete.searchStr, function(err, resultObj){
      if(err){
        console.error(err);
        console.log(MSG_HELP);
      }
      if(resultObj) {
        console.log("Complete. Check logs for any issues.");
      }
    });
  } else {
    console.log("No mode selected");
    console.log(MSG_HELP);
  }
  
};



function addParamsToDataObj(dataObj, pid, delSearchStr){
  debugData(addParamsToDataObj);
  return new Promise(function(resolve, reject) {
    dataObj.propID = pid || dataObj.propID;
    debugData("PID: " + dataObj.propID);
    if(!dataObj.delete) dataObj.delete = {};
    if(!dataObj.delete.searchStr) dataObj.delete.searchStr = "";
    dataObj.delete.searchStr = delSearchStr || dataObj.delete.searchStr;
    debugData("Del Str: " + dataObj.delete.searchStr);
    resolve(dataObj);
  });
}

function getArgActions(arguments){
  let actions = [];
  if(arguments.C || arguments.E || arguments.D || arguments.R || arguments.L || arguments.P){
    if(arguments.C) actions.push("C");
    if(arguments.E) actions.push("E");
    if(arguments.D) actions.push("D");
    if(arguments.R) actions.push("R");
    if(arguments.L) actions.push("L");
    if(arguments.P) actions.push("P");
  } else { // create and import everything
    actions = ["C", "E", "D", "R", "L", "P"];
  }
  debugArgs(actions);
  return actions;
}


exports.run = init;
exports.modes = modes;