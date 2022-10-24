const newmanTF = require("./newmanFunctions.js");
var packageInfo = require("./package.json");
const yaml = require("js-yaml");
const fs = require("fs");
var minimist = require("minimist");
var args = minimist(process.argv.slice(2));
var path = require("path");
var debug = require("debug");
var debugIndex = require("debug")("index");
var debugConfig = require("debug")("index:config");
var debugNewman = require("debug")("index:newman");

//TODO Create github action for publishing
//TODO formalize the package.json

var init = function(mode, configParam, envParam, globalsParam, pidParam, searchStrParam){
  const HELP_F = "-f  <file>                      configuration [json | yml] file";
  const HELP_E = "-e  <postman_environment.json>  specify an environment file";
  const HELP_P = "-p, --pid  <pid>                property ID. Req for export mode";
  const HELP_S = "-s, --search  <str>             search string for properties to delete. Reg for delete mode";
  const MSG_HELP = `Usage: `+ packageInfo.name.replace("@knennigtri/", "") + ` [ARGS]
 Arguments:
    --export                        Mode to export a given property ID
    --import                        Mode to import a property given a config file
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
 export:
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
   configfile.export.propID
`;
  const MSG_HELP_IMPORT = `Import mode requires:
 ` + HELP_E + `
 ` + HELP_F + `

  The config file requires:
    configFile.import.extensions
    configFile.import.dataElements
    configFile.import.rules.[rules]
 `; //TODO
  const MSG_HELP_DELETE = `Delete mode requires:
 ` + HELP_E + `
 ` + HELP_S + `
  
  These values can alternatively be set in the config file:
    configFile.environment
    configfile.delete.searchStr
 `;

  const modes = {
    export: "export",
    import: "import",
    delete: "delete"
  };

  const config = configParam || args.f;
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

  //Read the config file or assign the object for parsing
  let configContents;
  let configFileDir;
  if(typeof config == "string"){
    configContents = fs.readFileSync(config, "utf8");
    configFileDir = path.dirname(path.resolve(config));
  } else {
    configContents = config;
    configFileDir = "./";
  }

  //Parse the config for YAML/JSON
  let jsonObj = {};
  if(config){
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
  }
  if(!jsonObj) return; //TODO help screen... might not be needed.

  if(!jsonObj.export) jsonObj.export = {};
  jsonObj.export.propID = argsPID || jsonObj.export.propID;
  if(!jsonObj.delete) jsonObj.delete = {};
  jsonObj.delete.searchStr = argsSearch || jsonObj.delete.searchStr;
  
  
  //setup the data with ABS paths if they aren't objects
  let env = getData(jsonObj.environment, configFileDir);
  jsonObj.environment = argsEnv || env;
  let g = getData(jsonObj.globals, configFileDir);
  jsonObj.globals = argsGlobals || g;

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
    console.log("No environment specified");
    //TODO help 
    return;
  }

  debugConfig(JSON.stringify(jsonObj, null, 2));
  if(debug.enabled("index:config")){
    return;
  }
    
  //Export Mode
  //requires pid (cli -p, --pid | file.export.propID)
  if(argsMode == modes.export){
    if(!jsonObj.export || !jsonObj.export.propID){
      console.log("Export mode must have a propertyID to export from the environment");
      //TODO help
      return;
    }
    console.log("PropID: "+jsonObj.export.propID);
    newmanTF.exportTag(jsonObj, configFileDir, function(err, resultObj){
      if(err) throw err;
      if(resultObj) console.log("Exported Tag property!");
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
      //TODO help
      return;
    }
    if(!jsonObj.import ||
      !jsonObj.import.propertyName ||
      !jsonObj.import.extensions ||
      !jsonObj.import.dataElements ||
      !jsonObj.import.rules){
      console.log("Import mode is missing values to import");
      //TODO help
      return;
    }
    newmanTF.importTag(jsonObj, function(err, resultObj){
      if(err) throw err;
      if(resultObj) console.log("Successfully created tag property: " + resultObj.import.propertyName);
    });
    
    //DELETE mode
    //Requires searchStr (cli -s, --search | file.delete.searchStr)
  } else if(argsMode == modes.delete){
    if(!jsonObj.delete || !jsonObj.delete.searchStr){
      console.log("Delete mode must have a search string");
      //TODO help
      return;
    }
    console.log("SearchStr: " + jsonObj.delete.searchStr);
    newmanTF.deleteTags(jsonObj, jsonObj.delete.searchStr, function(err, resultObj){
      if(err) throw err;
      if(resultObj) console.log("All tag propertys deleted with: " + resultObj.delete.searchStr);
    });
  } else {
    console.log("No mode selected");
    //TODO help
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