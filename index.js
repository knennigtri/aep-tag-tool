const newman = require('newman');
const yaml = require('js-yaml');
const fs = require('fs');
var minimist = require("minimist");
var args = minimist(process.argv.slice(2));
var path = require("path");
var debug = require("debug");
var debugIndex = require("debug")("index");
var debugConfig = require("debug")("index:config");
var debugNewman = require("debug")("index:newman");

var REPORTERS = ['emojitrain','junit', 'html'];


var IO_COLLECTION = "https://www.getpostman.com/collections/c962d6b3b81776a4c4bf";
var EXPORT_COLLECTION = "https://www.getpostman.com/collections/e8287cbeae23e348a791";
var IMPORT_COLLECTION = "https://www.getpostman.com/collections/c0c463dbe2f98d3b354a";
var DELETE_PROPS = "https://www.getpostman.com/collections/dc9e91b64f454a9b1bac";

//Development commands
// IMPORT_COLLECTION = "https://www.getpostman.com/collections/2f3dc4c81eb464c21693";
// DELETE_PROPS = "https://www.getpostman.com/collections/357a7d9bea644bfc5b46";
// EXPORT_COLLECTION = "https://www.getpostman.com/collections/55520565b0f9933b5cf8";
// REPORTERS = ['cli','junit', 'html'];

let TIMESTAMP = formatDateTime();
let reportersDir = "newman/";

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
  }

  const config = configParam || args.f;
  let argsEnv = envParam || args.e;
  let argsGlobals = globalsParam || args.g;
  const argsPID = pidParam || args.p || args.pid;
  const argsSearch = searchStrParam || args.s || args.search
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
    configContents = fs.readFileSync(config, 'utf8');
    configFileDir = path.dirname(path.resolve(config));
  } else {
    configContents = config;
    configFileDir = "./";
  }
  reportersDir = configFileDir + "/" + reportersDir;

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
  for (rule in jsonObj.import.rules){
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
  if(debug.enabled('index:config')){
    return;
  }

  // First authenticate before running and mode
  authenicateAIO(jsonObj, function(err, yamlObj){
    if(err) throw err;
    console.log('Connected to AIO');
    
    //Export Mode
    //requires pid (cli -p, --pid | file.export.propID)
    if(argsMode == modes.export){
      if(!jsonObj.export || !jsonObj.export.propID){
        console.log("Export mode must have a propertyID to export from the environment");
        //TODO help
        return;
      }
      console.log("PropID: "+jsonObj.export.propID);
      exportTag(yamlObj, configFileDir, function(err, yamlObj){
        if(err) throw err;
        console.log('Exported Tag property!');
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
      createProperty(yamlObj, function(err, yamlObj){
        if(err) throw err;
        console.log('Created Tag Property!');

        installExtension(yamlObj, function(err, yamlObj){
          if(err) throw err;
          console.log('Installed Extensions!');
          importDataElements(yamlObj, function(err, yamlObj){
            if(err) throw err;
            console.log('Imported Data Elements!');
            importRules(yamlObj, function(err, yamlObj){
              if(err) throw err;
          
              publishLibrary(yamlObj, function(err, yamlObj){
                if(err) throw err;
                console.log("Tag Property published successfully!");

                //Get the final tag property title
                let tagName = getEnvironmentValue(yamlObj.environment, "propFullName");
                console.log("Successfully created tag property: " + tagName);
              });
            });
          });
        });
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
      deleteTags(yamlObj, yamlObj.delete.searchStr, function(err, results){
        if(err) throw err;
        console.log("All tag propertys deleted with: " + jsonObj.delete.searchStr);
      });
    } else {
      console.log("No mode selected");
      //TODO help
    }

  });
  
}

// Runs the Adobe IO Token collection
function authenicateAIO(yamlObj, callback){
  const name = "auth";
  const reportName = TIMESTAMP +"-"+ name + "-Report";

  newman.run({
    collection: IO_COLLECTION,
    environment: yamlObj.environment,
    reporters: REPORTERS,
    reporter: {
      'html': { export: reportersDir+reportName+".html" },
      'junit': { export: reportersDir+reportName+".xml" }}
  }).on('done', function (err, summary) {
    if (err) { callback(err, false) }
    
    //set environment with the AIO token
    yamlObj.environment = summary.environment;
    if(summary.run.failures == ""){
      callback(null, yamlObj, summary);
    } else {
      callback(new Error("Collection Run Failures"), null, summary);
    }
  });
}

// Runs the Import Tag collection folder "Create Tag Property"
function createProperty(yamlObj, callback){
  const name = "createProp";
  const reportName = TIMESTAMP +"-"+ name + "-Report";
  newman.run({
    collection: IMPORT_COLLECTION,
    environment: yamlObj.environment,
    folder: "Create Tag Property",
    envVar: [{
      "key": "propName",
      "value": yamlObj.import.propertyName
    }],
    reporters: REPORTERS,
    reporter: {
      'html': { export: reportersDir+reportName+".html" },
      'junit': { export: reportersDir+reportName+".xml" }}
  }).on('done', function (err, summary) {
    if (err) { throw err; }
    // Get the resulting environment with the token
    yamlObj.environment = summary.environment;
    if(summary.run.failures == ""){
      callback(null, yamlObj, summary);
    } else {
      callback(new Error("Collection Run Failures"), null, summary);
    }
  });
}

// Runs the Import Tag collection folder "Add Tag Extensions"
function installExtension(yamlObj, callback){
  const name = "installExts";
  const reportName = TIMESTAMP +"-"+ name + "-Report";
  
  newman.run({
    collection: IMPORT_COLLECTION,
    environment: yamlObj.environment,
    globals: yamlObj.globals,
    folder: "Add Tag Extensions",
    iterationData: yamlObj.import.extensions,
    reporters: REPORTERS,
    reporter: {
      'html': { export: reportersDir+reportName+".html" },
      'junit': { export: reportersDir+reportName+".xml" }}
  }).on('done', function (err, summary) {
    if (err) { throw err; }
    if(summary.run.failures == ""){
      callback(null, yamlObj, summary);
    } else {
      callback(new Error("Collection Run Failures"), null, summary);
    }
    
  });
}

// Runs the Import Tag collection folder "Add Tag Data Elements"
function importDataElements(yamlObj, callback){
  const name = "installDataElements";
  const reportName = TIMESTAMP +"-"+ name + "-Report";

  newman.run({
    collection: IMPORT_COLLECTION,
    environment: yamlObj.environment,
    globals: yamlObj.globals,
    folder: "Add Tag Data Elements",
    iterationData: yamlObj.import.dataElements,
    reporters: REPORTERS,
    reporter: {
      'html': { export: reportersDir+reportName+".html" },
      'junit': { export: reportersDir+reportName+".xml" }}
  }).on('done', function (err, summary) {
    if (err) { throw err; }
    
    if(summary.run.failures == ""){
      callback(null, yamlObj, summary);
    } else {
      callback(new Error("Collection Run Failures"), null, summary);
    }

  });
}

/** Recursive function to 
 *  - grab yamlObj.rules[0]
 *  - delete yamlObj.rules[0]
 *  - run newman and recurse yamlObj.rules
 *  - recursion breaks when all rules are deleted
 */
function importRules(yamlObj, callback){
  var ruleName = Object.keys(yamlObj.import.rules)[0];
  var ruleCmps = Object.values(yamlObj.import.rules)[0];
  const name = ruleName;
  const reportName = TIMESTAMP +"-"+ name + "-Report";

  //Break recursion if there are no rules left
  if(ruleName === undefined){
    callback(null, yamlObj);
  } else {
    //remove rule from yamlObj
    delete yamlObj.import.rules[ruleName];

    //run newman to create new rule
    newman.run({
      collection: IMPORT_COLLECTION,
      environment: yamlObj.environment,
      globals: yamlObj.globals,
      folder: "Add Tag Rule and CMPs",
      envVar: [{
        "key": "ruleName",
        "value": ruleName
      }],
      iterationData: ruleCmps,
      reporters: REPORTERS,
      reporter: {
      'html': { export: reportersDir+reportName+".html" },
      'junit': { export: reportersDir+reportName+".xml" }}
    }).on('done', function (err, summary) {
      if (err) { throw err; }
      
      if(summary.run.failures == ""){
        console.log('Imported Rule: ' + ruleName);
      } else {
        callback(new Error("Collection Run Failures"), null);
      }
      //recurse to the next rule
      importRules(yamlObj, callback);
    });
  }
}

// Runs the Import Tag collection folder "Publish Tag Library"
function publishLibrary(yamlObj, callback){
  const name = "publishLib";
  const reportName = TIMESTAMP +"-"+ name + "-Report";
  newman.run({
    collection: IMPORT_COLLECTION,
    environment: yamlObj.environment,
    globals: yamlObj.globals,
    folder: "Publish Tag Library",
    reporters: REPORTERS,
    reporter: {
      'html': { export: reportersDir+reportName+".html" },
      'junit': { export: reportersDir+reportName+".xml" }}
  }).on('done', function (err, summary) {
    if (err) { throw err; }

    if(summary.run.failures == ""){
      callback(null, yamlObj, summary);
    } else {
      callback(new Error("Collection Run Failures"), null, summary);
    }
  });
}

function deleteTags(yamlObj, searchStr, callback){
  const name = "deleteTags";
  const reportName = TIMESTAMP +"-"+ name + "-Report";
  newman.run({
    collection: DELETE_PROPS,
    environment: yamlObj.environment,
    envVar: [{
      "key": "tagNameIncludes",
      "value": searchStr
    }],
    reporters: REPORTERS,
    reporter: {
      'html': { export: reportersDir+reportName+".html" },
      'junit': { export: reportersDir+reportName+".xml" }}
  }).on('done', function (err, summary) {
    if (err) { throw err; }
    if(summary.run.failures == ""){
      callback(null, yamlObj, summary);
    } else {
      callback(new Error("Collection Run Failures"), null, summary);
    }
  });
}

function exportTag(yamlObj, workingDir, callback){
  //newman run $EXPORT_COLLECTION -e $ENVIRONMENT --env-var "propID=$propID"
  const name = "exportTag";
  const reportName = TIMESTAMP +"-"+ name + "-Report";
  newman.run({
    collection: EXPORT_COLLECTION,
    environment: yamlObj.environment,
    envVar: [{
      "key": "propID",
      "value": yamlObj.export.propID
    }],
    reporters: REPORTERS,
    reporter: {
      'html': { export: reportersDir+reportName+".html" },
      'junit': { export: reportersDir+reportName+".xml" }}
  }).on('done', function (err, summary) {
    if (err) { throw err; }
    if(summary.run.failures == ""){
      let tagExport = {};
      tagExport.import = {}
      tagExport.import.extensions = getEnvironmentValue(summary.environment, "exportExtensions");
      tagExport.import.dataElements = getEnvironmentValue(summary.environment, "exportDataElements");
      tagExport.import.ruleNames = getEnvironmentValue(summary.environment, "exportRules");
      // fs.writeFileSync('./env.json', JSON.stringify(summary.environment, null, 2) , 'utf-8');
      tagExport.import.rules = {};
      for(var element in tagExport.import.ruleNames){
        let ruleName = tagExport.import.ruleNames[element].attributes.name
        // console.log(tagExport.import.ruleNames[element].attributes.name);
        tagExport.import.rules[ruleName] = getEnvironmentValue(summary.environment, "exportRuleCmps-"+element);
      }

      //TODO pull out propertyName from Export to write
      propName = "export";
      tagExport.import.propertyName = propName;
      //Write to a file
      fs.writeFileSync(workingDir+"/"+propName+".json", JSON.stringify(tagExport,null,2));
      fs.writeFileSync(workingDir+"/"+propName+".yml", yaml.dump(tagExport));


      callback(null, yamlObj, summary);
    } else {
      callback(new Error("Collection Run Failures"), null, summary);
    }
  });
}

/******* Helper Functions ******/

function formatDateTime() {
  var d = new Date(Date.now());
  var year = d.getFullYear();
  var month = d.getMonth() + 1;
  var date = d.getDate();
  var hour = d.getHours();
  var min = (d.getMinutes() < 10 ? '0' : '') + d.getMinutes();
  var sec = (d.getSeconds() < 10 ? '0' : '') + d.getSeconds();
  var time = year + "-" + month + "-" + date + "-" + hour + ':' + min;
  return time;
}

function getEnvironmentValue(envObj, key){
  let envVals = JSON.parse(JSON.stringify(envObj.values));
  for(var element of envVals){
    if(element.key == key){
      // console.log(element.value);
      return element.value;
    }
  }
  return "";
}

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