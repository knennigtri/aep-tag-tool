const newman = require("newman");
const launch = require("./launch.js");
const fs = require("fs");
//https://www.npmjs.com/package/debug
const debug = require("debug");
const debugCollections = require("debug")("collections");
const debugNewman = require("debug")("newman");
require("debug")("newman:cli");
exports.debugOptions = {
  "collections": "Postman collection messages",
  "newman": "Newman command messages",
  "newman:cli": "Newman cli output for verbose messaging of collections"
};

let REPORTERS = ["emojitrain", "junit", "html"];
let IO_COLLECTION = require("./postman/Adobe IO Token.postman_collection.json");
let EXPORT_COLLECTION = require("./postman/Export Tag Property.postman_collection.json");
let IMPORT_COLLECTION = require("./postman/Import Tag Property.postman_collection.json");
let DELETE_PROPS = require("./postman/Delete Properties.postman_collection.json");

//Development commands
if (debug.enabled("collections")) {
  debugCollections("Using Postman Collections");
  IO_COLLECTION = "https://www.getpostman.com/collections/6ad99074fc75d564ac8a";
  IMPORT_COLLECTION = "https://www.getpostman.com/collections/2f3dc4c81eb464c21693";
  DELETE_PROPS = "https://www.getpostman.com/collections/357a7d9bea644bfc5b46";
  EXPORT_COLLECTION = "https://www.getpostman.com/collections/55520565b0f9933b5cf8";
}

//Mac: DEBUG=newman:cli aep-tag-tool....
//WIN: set DEBUG=newman:cli & aep-tag-tool....
if (debug.enabled("newman:cli")) {
  REPORTERS = ["cli", "junit", "html"];
}

let TIMESTAMP = formatDateTime();
let reportersDir = "newman/";

function exportTag(env, pid, exportDir, callback) {
  authenicateAIO(env)
    .then((resultEnv) => newmanRun("exportTag", 
      resultEnv, "", 
      EXPORT_COLLECTION, "", 
      "", [{
        "key": "propID",
        "value": pid
      }])
    )
    .then(function(resultEnv){
      let tagExport = {};
      tagExport.propID = pid;
      tagExport.propertyName = getEnvironmentValue(resultEnv, "exportPropName");
      tagExport.extensions = getEnvironmentValue(resultEnv, "exportExtensions");
      tagExport.dataElements = getEnvironmentValue(resultEnv, "exportDataElements");
      tagExport.ruleNames = getEnvironmentValue(resultEnv, "exportRules");
      tagExport.rules = {};
      for (var element in tagExport.ruleNames) {
        let ruleName = tagExport.ruleNames[element].attributes.name;
        tagExport.rules[ruleName] = getEnvironmentValue(resultEnv, "exportRuleCmps-" + element);
      }
      //Write to a file
      var propName = tagExport.propertyName.replace(/\s+/g, "-").toLowerCase();
      //TODO fix -o outputDir
      if(!exportDir) exportDir = ".";
      fs.writeFileSync(exportDir + "/" + propName + ".json", JSON.stringify(tagExport, null, 2));
    })
    .then((resultEnv) => callback(null, resultEnv))
    .catch(err => callback(err, null));
}

function importTag(env, importObj, actions, pid, globals) {
  return new Promise(function(resolve, reject) {
    authenicateAIO(env)
      .then(function(resultEnv){ //Add propID if importing to an existing property
        return new Promise(function (resolve,reject){
          if(!actions) actions = getImportActions(); //TODO verify it works
          if(actions[0] != "C"){
            if(pid){
              let env = launch.setEnvironmentValue(resultEnv, "propID", pid);
              if(env) resolve(env);
              else reject(new Error("Cannot update environment"));
            } else {
              reject(new Error("No propID specified to import into an existing property"));
            }
          } else resolve(resultEnv);
        });
      })  
      .then((resultEnv) => recurseImportChain(resultEnv, importObj, actions, globals))
      .then(resultEnv => resolve(resultEnv))
      .catch(err => reject(err));
  })
    .catch(err => console.error(err));
}

function recurseImportChain(environment, importItems, actions, globals){
  const nextAction = actions.shift();
  if(nextAction){
    if(nextAction === "C"){
      return createProperty(environment, importItems, globals)
        .then((resultEnv) => recurseImportChain(resultEnv, importItems, actions, globals));
    } else if(nextAction === "E"){
      return installExtensions(environment, importItems, globals)
        .then((resultEnv) => recurseImportChain(resultEnv, importItems, actions, globals));
    } else if(nextAction === "D"){
      return importDataElements(environment, importItems, globals)
        .then((resultEnv) => recurseImportChain(resultEnv, importItems, actions, globals));
    } else if(nextAction === "R"){
      return importRules(environment, importItems, globals)
        .then((resultEnv) => recurseImportChain(resultEnv, importItems, actions, globals));
    } else if(nextAction === "L"){
      return publishLibraryToDev(environment, globals)
        .then((resultEnv) => recurseImportChain(resultEnv, "", actions, globals));
    } else if(nextAction === "P"){
      return publishLibraryToProd(environment, globals)
        .then((resultEnv) => recurseImportChain(resultEnv, "", actions, globals))
        .then(function (resultEnv){
          let artifactURL = getEnvironmentValue(resultEnv, "prodArtifactURL");
          console.log("Prod Library embed code: ");
          console.log("<script src='"+artifactURL+"' async></script>");
        });
    } else Promise.resolve(environment);
  }else{
    return Promise.resolve(environment);
  }
}

function deleteTags(env, searchStr, callback) {
  authenicateAIO(env)
    .then((resultEnv) => newmanRun("deleteTags", 
      resultEnv, "", 
      DELETE_PROPS, "", 
      "", [{
        "key": "tagNameIncludes",
        "value": searchStr
      }])
    )
    .then((resultEnv) => callback(null, resultEnv))
    .catch(err => callback(err, null));
}

// Runs the Adobe IO Token collection
function authenicateAIO(environment) {
  return newmanRun("auth", 
    environment, "", 
    IO_COLLECTION, "", 
    "", "");
}

// Runs the Import Tag collection folder "Create Tag Property"
function createProperty(environment, importItems, globals) {
  
  return newmanRun("createProp", 
    environment, globals, 
    IMPORT_COLLECTION, "Create Tag Property", 
    "", [{
      "key": "propName",
      "value": importItems.propertyName
    }]);
}

// Runs the Import Tag collection folder "Add Tag Extensions"
function installExtensions(environment, importItems, globals) {
  return newmanRun("installExts", 
    environment, globals, 
    IMPORT_COLLECTION, "Add Tag Extensions", 
    importItems.extensions, "");
}

// Runs the Import Tag collection folder "Add Tag Data Elements"
function importDataElements(environment, importItems, globals) {
  return newmanRun("installDataElements", 
    environment, globals, 
    IMPORT_COLLECTION, "Add Tag Data Elements", 
    importItems.dataElements, "");
}

async function importRules(environment, importItems, globals){
  for(const rule in importItems.rules){
    await newmanRun(rule, 
      environment, 
      globals, 
      IMPORT_COLLECTION, 
      "Add Tag Rule and CMPs", 
      importItems.rules[rule], 
      [{
        "key": "ruleName",
        "value": rule
      }]);
  }
  return environment;
}

// Runs the Import Tag collection folder "Publish Dev"
function publishLibraryToDev(environment, globals) {
  return newmanRun("publishLibDev", 
    environment, globals, 
    IMPORT_COLLECTION, "Publish Dev", 
    "", "");
}

// Runs the Import Tag collection folder "Publish Prod"
function publishLibraryToProd(environment, globals) {
  return newmanRun("publishLibProd", 
    environment, globals, 
    IMPORT_COLLECTION, "Publish Prod", 
    "", "");
}

/******* Helper Functions ******/

function newmanRun(cmdName, env, globals, collection, folder, data, envVar){
  var f2 = function (k, v) { return k && v && typeof v !== "number" ? "" + v : v; };
  debugNewman(JSON.stringify(data, f2, 2));

  const reportName = TIMESTAMP + "-" + cmdName + "-Report";
  if(folder && folder != ""){
    console.log("Running: " + folder + " for: " + cmdName);
  } else { 
    console.log("Running: " + cmdName);
  }

  debugNewman("ReportNameHTML: "+ reportersDir + reportName + ".[html | xml]");
  // Uncomment to generate the final postman environment file
  // console.log(JSON.stringify(env));
  return new Promise(function(resolve, reject) {
    //run newman to create new rule
    newman.run({
      collection: collection,
      environment: env,
      globals: globals,
      folder: folder,
      envVar: envVar,
      iterationData: data,
      reporters: REPORTERS,
      reporter: {
        "html": { export: reportersDir + reportName + ".html" },
        "junit": { export: reportersDir + reportName + ".xml" }
      }//TODO investigate saving via Win and Mac
    }).on("done", function (err, summary) {
      if (err) reject(err);

      if (summary.run.failures == "") {
        console.log("Success!");
      } else {
        reject("API Failures. Check the report logs in " + reportersDir);
      }
      resolve(summary.environment);
    });
  });
}

function formatDateTime() {
  var d = new Date(Date.now());
  var year = d.getFullYear();
  var month = d.getMonth() + 1;
  var date = d.getDate();
  var hour = d.getHours();
  var min = (d.getMinutes() < 10 ? "0" : "") + d.getMinutes();
  var time = year + "-" + month + "-" + date + "-" + hour + ":" + min;
  return time;
}

function getImportActions(create, extensions, dataElements, rules, libraryToDev, publishToProd){
  let actions = [];
  if(create || extensions || dataElements || rules || libraryToDev || publishToProd){
    if(create) actions.push("C");
    if(extensions) actions.push("E");
    if(dataElements) actions.push("D");
    if(rules) actions.push("R");
    if(libraryToDev) actions.push("L");
    if(publishToProd) actions.push("P");
  } else { // create and import everything
    actions = ["C", "E", "D", "R", "L", "P"];
  }
  debugNewman(actions);
  return actions;
}

function getEnvironmentValue(envObj, key) {
  let envVals = JSON.parse(JSON.stringify(envObj.values));
  for (var element of envVals) {
    if (element.key == key) {
      return element.value;
    }
  }
  return "";
}

exports.getImportActions = getImportActions;
exports.exportTag = exportTag;
exports.importTag = importTag;
exports.deleteTags = deleteTags;