const newman = require("./newman.js");
const launch = require("./launch.js");
var packageInfo = require("./package.json");
var minimist = require("minimist");
var args = minimist(process.argv.slice(2));
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
  + JSON.stringify(launch.debugOptions, null, 2)
    .replaceAll("\": ","     >")   
    .replaceAll("\"","")
    .replaceAll(",","")
    .replaceAll("{\n","")
    .replaceAll("}","")
    ;

function init(envParam, mode, dataParam, pidParam, workingDirParam, searchStrParam, globalsParam){
//TODO update parameters
// aep-tag-tool -c ./my.config.xml --delete "2023"
// aep-tag-tool -c ./my.config.xml -d "2023"
// aep-tag-tool -c ./my.config.xml --export ./exports/
// aep-tag-tool -c ./my.config.xml -e ./exports/ -p P12345
// aep-tag-tool -c ./my.config.xml --import ./myProperty.json
// aep-tag-tool -c ./my.config.xml -i ./myProperty.json
 
//TODO support CSV 
// aep-tag-tool -c ./myCSV.csv --import
// aep-tag-tool -c ./myCSV.csv --import ./myproperty.json
// aep-tag-tool -c ./myCSV.csv --delete "2023"
  let data = dataParam || args.f;
  let argsEnv = envParam || args.e;
  let argsGlobals = globalsParam || args.g;
  const argsPID = pidParam || args.p || args.pid;
  const argsSearch = searchStrParam || args.s || args.search;
  const argsWorkingDir = workingDirParam || args.d || args.directory; //TODO add param
  const argsVersion = args.v || args.version;
  const argsHelp =  args.h || args.help;
  
  // Show CLI help
  if (argsHelp) {
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
  
  //TODO Iterate config files
  //If config.csv, iterate through config.yml
  //Specify config.yml

  //create AuthObj from config.yml
  let authObj = launch.createAuthObjSync(argsEnv);
  if(!authObj) {
    console.log("Environment not properly configured"); //TODO better message
    console.log(MSG_HELP);
    return;
  }
  debugDryRun(JSON.stringify(authObj, null, 2));

  if((mode && mode.toLowerCase() == modes.export) ||  args.export){ //EXPORT
    if(!argsPID){
      console.log("Export mode must have a property ID specified");
      console.log(MSG_HELP);
      return;
    }
    console.log("PropID: "+argsPID);
    
    if(debug.enabled("dryrun")){
      debugDryRun("PID: " + argsPID);
      debugDryRun("workingDir: " + argsWorkingDir);
    } else {
      newman.exportTag(authObj, argsPID, argsWorkingDir, function(err, resultObj){
        if(err){
          console.error(err);
          console.log(MSG_HELP);
        }
        if(resultObj) {
          console.log("Complete. Check logs for any issues.");
        }
      });
    }
  } else if((mode && mode.toLowerCase() == modes.import) ||  args.import){  //IMPORT
    let curPID = pidParam;
    let curImportFile = data;

    //TODO import iterations
    //if -f exists, 1 iteration on -f
      //if pid, set it
    //elseif config.yml.imports exists, iterate number needed
      //{file.json: "Pxxxxx"}
    //Iterate the code below
    
    let curImportObj = launch.createLaunchObjSync(curImportFile);
    if(!curImportObj){
      console.log("Cannot parse import object or it DNE");
      console.log(MSG_HELP);
      return;
    }
    let actions = newman.getImportActions(args.C, args.E, args.D, args.R, args.L, args.P);
    if(!actions.includes("C") && !curPID){
      console.log("A PID (-p) is required when importing without creating a new property");
      console.log(MSG_HELP);
      return;
    }
    if(debug.enabled("dryrun")){
      var f2 = function (k, v) { return k && v && typeof v !== "number" ? "" + v : v; };
      debugDryRun(JSON.stringify(curImportObj, f2, 2));
      debugDryRun("PID: " + argsPID);
      debugDryRun("Actions: " + actions);
    } else {
      newman.importTag(authObj, curImportObj, actions, curPID, globalsParam, function(err, resultObj){
        if(err){
          console.error(err);
          console.log(MSG_HELP);
        }
        if(resultObj) {
          console.log("Complete. Check logs for any issues.");
        }
      });
    }

  } else if((mode && mode.toLowerCase() == modes.delete) ||  args.delete){ //DELETE
    if(!argsSearch){
      console.log("Delete mode must have a search string specified");
      console.log(MSG_HELP);
      return;
    }
    console.log("SearchStr: " + argsSearch);
    if(debug.enabled("dryrun")){
      debugDryRun("SearchStr: " + argsSearch);
    } else {
      newman.deleteTags(authObj, argsSearch, function(err, resultObj){
        if(err){
          console.error(err);
          console.log(MSG_HELP);
        }
        if(resultObj) {
          console.log("Complete. Check logs for any issues.");
        }
      });
    }
  } else {
    console.log("No mode selected");
    console.log(MSG_HELP);
  }
}

exports.run = init;
exports.modes = modes;