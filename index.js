const newman = require("./newman.js");
const launch = require("./launch.js");
const packageInfo = require("./package.json");
const minimist = require("minimist");
const args = minimist(process.argv.slice(2));
//https://www.npmjs.com/package/debug
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

function init(envParam, modeParam, dataParam, pidParam, workingDirParam, searchStrParam, authMethod){
  let mode = "";
  if(modeParam?.toLowerCase() == modes.export ||  args.export || args.e) mode = modes.export;
  if(modeParam?.toLowerCase() == modes.import ||  args.import || args.i) mode = modes.import;
  if(modeParam?.toLowerCase() == modes.delete ||  args.delete || args.d) mode = modes.delete;
  let argsEnv = envParam || args.config || args.c;
  let argsAuth = authMethod?.toLowerCase() || launch.auth.oauth; //default is oauth
  if(args.jwt) argsAuth = launch.auth.jwt;
  if(args.oauth) argsAuth = launch.auth.oauth;
  
  
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
  let authObj = launch.createAuthObjSync(argsEnv, argsAuth);
  debugDryRun(JSON.stringify(authObj, null, 2));
  if(!authObj) {
    console.log("Authentication not properly configured. Make sure your config file has the required Auth values.");
    console.log("Use -h config to learn mode");
    return;
  } else console.log("Auth object successfully created.");
  
  console.log("Running mode: " + mode);
  if(mode == modes.export){ //EXPORT
    //optionally change the working directory for export
    const workingDir = workingDirParam || args.o || args.output;

    //exportPID. --pid, -p first priority, --export, -e second priority
    let exportPID = pidParam || args.pid || args.p || args.export || args.e;
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
    const importPID = pidParam || args.pid || args.p || "";

    //importFile. --file, -f first priority, --import, -i second priority
    let propertiesFile = dataParam || args.file || args.f || args.import || args.i;
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
      propsToImport[propertiesFile] = importPID;
    }
    
    debugDryRun(JSON.stringify(propsToImport,null,2));
    recursiveImport(authObj, propsToImport);
    
  } else if(mode == modes.delete){ //DELETE
    //searchStr. --search, -s first priority, --delete, -d second priority
    let searchStr = searchStrParam || args.search || args.s || args.delete || args.d;
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
function recursiveImport(authObj, propertyFilesToImport){
  //Grab the first file and remove it from propertyFilesToImport
  let nextPropertyFile = Object.keys(propertyFilesToImport)[0];
  let nextPID = propertyFilesToImport[nextPropertyFile];
  delete propertyFilesToImport[nextPropertyFile];
  
  if(nextPropertyFile) { 
    console.log("Importing: " + nextPropertyFile);

    let propertyObj = launch.createLaunchObjSync(nextPropertyFile);    
    if(!propertyObj){
      console.log("Cannot parse or it DNE: " + nextPropertyFile);
      console.log("Skipping...");
    } else { 
      let actions = newman.getImportActions(args.C, args.E, args.D, args.R, args.L, args.P);
      if(!actions.includes("C") && !nextPID){
        console.log("A PID (-p) is required when importing without creating a new property");
        console.log("Skipping..");
      } else {
        if(debug.enabled("dryrun")){
          // var f2 = function (k, v) { return k && v && typeof v !== "number" ? "" + v : v; };
          debugDryRun("Importing: " + nextPropertyFile);
          // debugDryRun(JSON.stringify(propertyObj, f2, 2));
          debugDryRun("PID: " + nextPID);
          debugDryRun("Actions: " + actions);
          debugDryRun("Auth: " + authObj);
          return recursiveImport(authObj, propertyFilesToImport);
        } else {
          //TODO decide on global inclusion
          return newman.importTag(authObj, propertyObj, actions, nextPID, "")
            .then(() => recursiveImport(authObj, propertyFilesToImport));
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