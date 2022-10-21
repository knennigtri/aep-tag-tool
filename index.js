const newmanTF = require("./newmanFunctions.js");
const yaml = require("js-yaml");
const fs = require("fs");
var minimist = require("minimist");
var args = minimist(process.argv.slice(2));
var path = require("path");
var debug = require("debug");
var debugIndex = require("debug")("index");
var debugConfig = require("debug")("index:config");
var debugNewman = require("debug")("index:newman");





/**
 * CMD export
 * require pid (cli -p, --pid | file.exportPropID)
 * require environment (cli -e | file.environment)
 * 
 * CMD import
 * require environment (cli -e | file.environment)
 * require -f, --file
 * file.propertyName
 * file.extensions
 * file.dataElements
 * file.rules.{rule1, rule2}
 * 
 * CMD delete
 * require searchStr (cli -s, --search | file.deleteSearchStr)
 * require environment (cli -e | file.environment)
 */

var init = function(mode, configParam, envParam, globalsParam, pidParam, searchStrParam){
/** CLI arguments
 * -f json/yml file
 * --[import | export | delete STR] modes this tool uses
 *     STR - string value that should be searched in the property titles for deletion
 * //TODO -e specify an environment file
 * //TODO -g specify a global file
 * //TODO -h, --help
 * //TODO -v, --version
 */
  //TODO implement debugging
  //TODO implement lint

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
  //TODO move to newmanTF
  var reportersDir = configFileDir + "/newman/" + reportersDir;

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

  //TODO Import Mode
  // if(!jsonObj.propertyName) return; //TODO help screen
  // debugConfig("Name: " + jsonObj.propertyName);

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
      if(resultObj) console.log("Successfully created tag property: " + resultObj.propertyName);
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