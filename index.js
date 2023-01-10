const newmanTF = require("./newmanFunctions.js");
var packageInfo = require("./package.json");
const yaml = require("js-yaml");
const fs = require("fs");
var minimist = require("minimist");
var args = minimist(process.argv.slice(2));
var path = require("path");
var debug = require("debug");
var debugConfig = require("debug")("index:config");
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

var init = function(mode, configParam, envParam, globalsParam, pidParam, searchStrParam){
  let config = configParam || args.f;
  let argsEnv = envParam || args.e;
  let argsGlobals = globalsParam || args.g;
  const argsPID = pidParam || args.p || args.pid;
  const argsSearch = searchStrParam || args.s || args.search;
  const argsVersion = args.v || args.version;
  const argsHelp =  args.h || args.help;
  let argsMode = "";

  argsEnv = getData(argsEnv, "./");
  argsGlobals = getData(argsGlobals, "./");
  
  if((mode && mode.toLowerCase() == modes.export) ||  args.export){
    argsMode = modes.export;
  } else if((mode && mode.toLowerCase() == modes.import) ||  args.import){
    argsMode = modes.import;
  } else if((mode && mode.toLowerCase() == modes.delete) ||  args.delete){
    argsMode = modes.delete;
  }

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
    }
    return;
  }

  // Show version
  if (argsVersion) {
    console.log(packageInfo.version);
    return;
  }

  //Read the config file or assign the object
  let configFileDir;
  let jsonObj = {};
  if(config){   //Check if there is a config file/object
    let configContents;
    if(typeof config == "string"){
      if(fs.lstatSync(config).isFile()){
        config = path.resolve(config);
        configContents = fs.readFileSync(config, "utf8");
        configFileDir = path.dirname(config);
      } else {
        console.log("-f parameter is not a file.");
        console.log(MSG_HELP);
        return;
      }
    } else if(typeof config  === "object" && config !== null) {
      configContents = config;
      configFileDir = "./";
    } 

    // Parse the configContents from YAML or JSON
    try {
      //Attempt to read the YAML and output JSON
      let data = yaml.loadAll(configContents,"json");
      let yamlContents = JSON.stringify(data[0], null, 2);
      jsonObj = JSON.parse(yamlContents);
    } catch {
      console.log("Could not read YAML, attemping JSON");
      try {
        //Attempt to read JSON
        jsonObj = JSON.parse(configContents);
      } catch(e){
        console.log("File does not contain valid YAML or JSON content.");
        throw e;
      }
    }
  } else {
    jsonObj = {};
    configFileDir = "./";
  }

  //set PID and searchStr values
  jsonObj.propID = argsPID || jsonObj.propID;
  if(!jsonObj.delete) jsonObj.delete = {};
  jsonObj.delete.searchStr = argsSearch || jsonObj.delete.searchStr;
  
  
  //setup the data with ABS paths if they aren't objects
  jsonObj.environment = argsEnv || getData(jsonObj.environment, configFileDir);
  jsonObj.globals = argsGlobals || getData(jsonObj.globals, configFileDir);

  if(!jsonObj.import) jsonObj.import = {};
  let ext = getData(jsonObj.import.extensions, configFileDir);
  jsonObj.import.extensions = ext;
  let de = getData(jsonObj.import.dataElements, configFileDir);
  jsonObj.import.dataElements = de;
  for (let rule in jsonObj.import.rules){
    let ruleCmps = getData(jsonObj.import.rules[rule], configFileDir);
    jsonObj.import.rules[rule] = ruleCmps;
  }
  
  /** All Modes require an environment (cli -e | file.environment) */
  if(!jsonObj.environment){
    console.log("No environment Specified.");
    console.log(MSG_HELP);
    return;
  }

  debugConfig(JSON.stringify(jsonObj, null, 2));
  if(debug.enabled("index:config")){
    return;
  }
    
  //Export Mode
  //requires pid (cli -p, --pid | file.propID)
  if(argsMode == modes.export){
    if(!jsonObj.propID){
      console.log("Export mode must have a property ID specified");
      console.log(MSG_HELP);
      return;
    }
    console.log("PropID: "+jsonObj.propID);
    newmanTF.exportTag(jsonObj, configFileDir, function(err, resultObj){
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
  } else if(argsMode == modes.import){ // IMPORT mode
    if(!config){
      console.log("Configuration file/object is missing for import");
      console.log(MSG_HELP);
      return;
    }
    if(!jsonObj.import){
      console.log("Import mode is missing values to import");
      console.log(MSG_HELP);
      return;
    }
    newmanTF.importTag(jsonObj, args, function(err, resultObj){
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
  } else if(argsMode == modes.delete){
    if(!jsonObj.delete || !jsonObj.delete.searchStr){
      console.log("Delete mode must have a search string specified");
      console.log(MSG_HELP);
      return;
    }
    console.log("SearchStr: " + jsonObj.delete.searchStr);
    newmanTF.deleteTags(jsonObj, jsonObj.delete.searchStr, function(err, resultObj){
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

function getData(data, rootDir){
  if(typeof data == "string"){
    let absPath = path.resolve(rootDir, data);
    if(fs.existsSync(absPath)){
      // console.log("Using path:" +absPath);
      return absPath;
    } else {
      throw new Error("Cannot Read File: " + absPath);
    }
  } else {
    // console.log("Returning Data: " +data);
    return data;
  }
}

exports.run = init;
exports.modes = modes;