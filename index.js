const newman = require("./newman.js");
const pmEnv = require("./pmEnvironment.js");
const importObjUtil = require("./importObjectUtil.js");
const packageInfo = require("./package.json");
const minimist = require("minimist");
const args = minimist(process.argv.slice(2));
//https://www.npmjs.com/package/debug
//Mac: DEBUG=* aep-tag-tool....
//WIN: set DEBUG=* & aep-tag-tool....
const debug = require("debug");
const debugDryRun = require("debug")("dryrun");
const debugArgs = require("debug")("args");
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

function init(){
  let mode = "";
  if(args.export || args.e) mode = modes.export;
  if(args.import || args.i) mode = modes.import;
  if(args.delete || args.d) mode = modes.delete;
  let argsEnv = args.config || args.c;
  let argsAuth = authMethod?.toLowerCase() || pmEnv.auth.oauth; //default is oauth
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
  
  //TODO Allow for a config.csv which contains many config.yml files
  // aep-tag-tool -c ./myCSV.csv --import
  // aep-tag-tool -c ./myCSV.csv --import ./myproperty.json
  // aep-tag-tool -c ./myCSV.csv --delete "2023"

  //create AuthObj from config.yml
  let authObj = pmEnv.createAuthObj(argsEnv, argsAuth);
  debugDryRun(JSON.stringify(authObj, null, 2));
  if(!authObj) {
    console.log("Authentication not properly configured. Make sure your config file has the required Auth values.");
    console.log("Use -h config to learn mode");
    return;
  } else console.log("Auth object successfully created.");
  
  console.log("Running mode: " + mode);
  if(mode == modes.export){ //EXPORT
    //optionally change the working directory for export
    const workingDir = args.o || args.output;

    //exportPID. --pid, -p first priority, --export, -e second priority
    let exportPID = args.pid || args.p || args.export || args.e;
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
    let importPID = args.pid || args.p || "";
    let importTitle = args.title || args.t;

    //importFile. --file, -f first priority, --import, -i second priority
    let propertiesFile = args.file || args.f || args.import || args.i;
    let propsToImport = {};
    if(typeof propertiesFile == ("boolean" || "undefined")) {
      //TODO Recursive imports turned off until working
      // let configFileProperties = launch.getPropertiesFromConfig(argsEnv);
      // if(configFileProperties) {
      //   propsToImport = configFileProperties;
      // } else {
      console.log("Import mode must have at least 1 propertyFile. See -h import");
      console.log(message.HELP);
      return;
      // }
    } else {
      //single property to import
      let propertyObj = importObjUtil.createLaunchObjSync(propertiesFile);
      propertyObj.propertyName = importTitle || propertyObj.propertyName;
      propertyObj.propID = importPID;
      propsToImport[propertiesFile] = propertyObj;
    }
    
    debugDryRun(propsToImport);
    
    recursiveImport(authObj, propsToImport);
    
  } else if(mode == modes.delete){ //DELETE
    //searchStr. --search, -s first priority, --delete, -d second priority
    let searchStr = args.search || args.s || args.delete || args.d;
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
}

//TODO Recursively importing files results in messages being mixed. Need to review before enabling.
function recursiveImport(authObj, propertyObjsToImport){
  //Grab the first file and remove it from propertyFilesToImport
  let propertyFile = Object.keys(propertyObjsToImport)[0];
  let propertyObj = Object.values(propertyObjsToImport)[0];
  delete propertyObjsToImport[propertyFile];

  if(propertyFile) { 
    console.log("Importing: " + propertyFile);
    if(!propertyFile){
      console.log("Cannot parse or it DNE: " + propertyFile);
      console.log("Skipping...");
    } else { 
      let actions = newman.getImportActions(args.C, args.E, args.D, args.R, args.L, args.P);
      if(!actions.includes("C")){
        console.log("A PID (-p) is required when importing without creating a new property");
        console.log("Skipping..");
      } else {
        if(debug.enabled("dryrun")){
          debugDryRun("Importing: " + propertyFile + "\n" +
            "PID: " + propertyObj.propID + "\n" +
            "Actions: " + actions + "\n" +
            "Auth: " + authObj);
          return recursiveImport(authObj, propertyObjsToImport);
        } else {
          //TODO decide on global inclusion
          return newman.importTag(authObj, propertyObj, actions, "")
            .then(() => recursiveImport(authObj, propertyObjsToImport));
        }
      }
    }
  } else {
    return;
    // return Promise.resolve(nextPropertyFile);
  }


}

exports.run = init;
exports.modes = modes;