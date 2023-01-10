const newman = require("newman");
const fs = require("fs");
const debug = require("debug");
const debugCollections = require("debug")("collections");
const debugImport = require("debug")("import");

let REPORTERS = ["emojitrain", "junit", "html"];
let IO_COLLECTION = require("./collections/Adobe IO Token.postman_collection.json");
let EXPORT_COLLECTION = require("./collections/Export Tag Property.postman_collection.json");
let IMPORT_COLLECTION = require("./collections/Import Tag Property.postman_collection.json");
let DELETE_PROPS = require("./collections/Delete Properties.postman_collection.json");

//Development commands
if (debug.enabled("newmanTF:collections")) {
  debugCollections("Using Postman Collections");
  IO_COLLECTION = "https://www.getpostman.com/collections/6ad99074fc75d564ac8a";
  IMPORT_COLLECTION = "https://www.getpostman.com/collections/2f3dc4c81eb464c21693";
  DELETE_PROPS = "https://www.getpostman.com/collections/357a7d9bea644bfc5b46";
  EXPORT_COLLECTION = "https://www.getpostman.com/collections/55520565b0f9933b5cf8";
  // REPORTERS = ['cli','junit', 'html'];
}

let TIMESTAMP = formatDateTime();
let reportersDir = "newman/";

exports.exportTag = function exportTag(configObj, workingDir, callback) {
  authenicateAIO(configObj.environment, configObj)
    .then((resultEnv) => newmanRun("exportTag", 
      resultEnv, configObj.globals, 
      EXPORT_COLLECTION, "", 
      "", [{
        "key": "propID",
        "value": configObj.propID
      }])
    )
    .then(function(resultEnv){
      let tagExport = {};
      tagExport.propID = configObj.propID;
      tagExport.import = {};
      tagExport.import.propertyName = getEnvironmentValue(resultEnv, "exportPropName");
      tagExport.import.extensions = getEnvironmentValue(resultEnv, "exportExtensions");
      tagExport.import.dataElements = getEnvironmentValue(resultEnv, "exportDataElements");
      tagExport.import.ruleNames = getEnvironmentValue(resultEnv, "exportRules");
      tagExport.import.rules = {};
      for (var element in tagExport.import.ruleNames) {
        let ruleName = tagExport.import.ruleNames[element].attributes.name;
        tagExport.import.rules[ruleName] = getEnvironmentValue(resultEnv, "exportRuleCmps-" + element);
      }
      //Write to a file
      var propName = tagExport.import.propertyName.replace(/\s+/g, "-").toLowerCase();
      fs.writeFileSync(workingDir + "/" + propName + ".json", JSON.stringify(tagExport, null, 2));
    // fs.writeFileSync(workingDir+"/"+propName+".yml", yaml.dump(tagExport));
    })
    .then((resultEnv) => callback(null, resultEnv))
    .catch(err => callback(err, null));
};

exports.importTag = function importTag(configObj, args, callback) {
  let actions = [];
  if(args.C || args.E || args.D || args.R || args.L || args.P){
    if(args.C) actions.push("C");
    if(args.E) actions.push("E");
    if(args.D) actions.push("D");
    if(args.R) actions.push("R");
    if(args.L) actions.push("L");
    if(args.P) actions.push("P");
  } else { // create and import everything
    actions = ["C", "E", "D", "R", "L", "P"];
  }
  debugImport(actions);
  
  authenicateAIO(configObj.environment, configObj)
    .then(function(resultEnv){ //Add propID if importing to an existing property
      return new Promise(function (resolve,reject){
        if(actions[0] != "C"){
          if(configObj.propID){
            let env = setEnvironmentValue(resultEnv, "propID", configObj.propID);
            if(env) resolve(env);
            else reject(new Error("Cannot update environment"));
          } else {
            reject(new Error("No propID specified to import into an existing property"));
          }
        } else resolve(resultEnv);
      });
    })  
    .then((resultEnv) => recurseImportChain(actions, resultEnv, configObj))
    .then(function(resultEnv){
      callback(null, resultEnv);
    })
    .catch(err => callback(err, null));
};

function recurseImportChain(actions, environment, configObj){
  const nextAction = actions.shift();
  if(nextAction){
    if(nextAction === "C"){
      return createProperty(environment, configObj)
        .then((resultEnv) => recurseImportChain(actions, resultEnv, configObj));
    } else if(nextAction === "E"){
      return installExtensions(environment, configObj)
        .then((resultEnv) => recurseImportChain(actions, resultEnv, configObj));
    } else if(nextAction === "D"){
      return importDataElements(environment, configObj)
        .then((resultEnv) => recurseImportChain(actions, resultEnv, configObj));
    } else if(nextAction === "R"){
      return importRules(environment, configObj)
        .then((resultEnv) => recurseImportChain(actions, resultEnv, configObj));
    } else if(nextAction === "L"){
      return publishLibraryToDev(environment, configObj)
        .then((resultEnv) => recurseImportChain(actions, resultEnv, configObj));
    } else if(nextAction === "P"){
      return publishLibraryToProd(environment, configObj)
        .then((resultEnv) => recurseImportChain(actions, resultEnv, configObj))
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

exports.deleteTags = function deleteTags(configObj, searchStr, callback) {
  authenicateAIO(configObj.environment, configObj)
    .then((resultEnv) => newmanRun("deleteTags", 
      resultEnv, configObj.globals, 
      DELETE_PROPS, "", 
      "", [{
        "key": "tagNameIncludes",
        "value": searchStr
      }])
    )
    .then((resultEnv) => callback(null, resultEnv))
    .catch(err => callback(err, null));
};

// Runs the Adobe IO Token collection
function authenicateAIO(environment, configObj) {
  return newmanRun("auth", 
    environment, configObj.globals, 
    IO_COLLECTION, "", 
    "", "");
}

// Runs the Import Tag collection folder "Create Tag Property"
function createProperty(environment, configObj) {
  return newmanRun("createProp", 
    environment, configObj.globals, 
    IMPORT_COLLECTION, "Create Tag Property", 
    "", [{
      "key": "propName",
      "value": configObj.import.propertyName
    }]);
}

// Runs the Import Tag collection folder "Add Tag Extensions"
function installExtensions(environment, configObj) {
  return newmanRun("installExts", 
    environment, configObj.globals, 
    IMPORT_COLLECTION, "Add Tag Extensions", 
    configObj.import.extensions, "");
}

// Runs the Import Tag collection folder "Add Tag Data Elements"
function importDataElements(environment, configObj) {
  return newmanRun("installDataElements", 
    environment, configObj.globals, 
    IMPORT_COLLECTION, "Add Tag Data Elements", 
    configObj.import.dataElements, "");
}

async function importRules(environment, configObj){
  for(const rule in configObj.import.rules){
    await newmanRun(rule, 
      environment, 
      configObj.globals, 
      IMPORT_COLLECTION, 
      "Add Tag Rule and CMPs", 
      configObj.import.rules[rule], 
      [{
        "key": "ruleName",
        "value": rule
      }]);
  }
  return environment;
}

// Runs the Import Tag collection folder "Publish Prod"
function publishLibraryToProd(environment, configObj) {
  return newmanRun("publishLibProd", 
    environment, configObj.globals, 
    IMPORT_COLLECTION, "Publish Prod", 
    "", "");
}

// Runs the Import Tag collection folder "Publish Dev"
function publishLibraryToDev(environment, configObj) {
  return newmanRun("publishLibDev", 
    environment, configObj.globals, 
    IMPORT_COLLECTION, "Publish Dev", 
    "", "");
}



/******* Helper Functions ******/

function newmanRun(cmdName, env, globals, collection, folder, data, envVar){
  const reportName = TIMESTAMP + "-" + cmdName + "-Report";
  if(folder && folder != ""){
    console.log("Running: " + folder + " for: " + cmdName);
  } else { 
    console.log("Running: " + cmdName);
  }

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
      }
    }).on("done", function (err, summary) {
      if (err) reject(err);

      if (summary.run.failures == "") {
        console.log("Success!");
      } else {
        console.log("Import Failures. Check the report logs in " + reportersDir);
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

function getEnvironmentValue(envObj, key) {
  let envVals = JSON.parse(JSON.stringify(envObj.values));
  for (var element of envVals) {
    if (element.key == key) {
      return element.value;
    }
  }
  return "";
}

function setEnvironmentValue(envObj, key, value){
  envObj = JSON.parse(JSON.stringify(envObj));
  let addVal = true;
  let envVal = {};
  if(envObj && envObj.values){
    for(let i = 0; i < envObj.values.length; i++){
      envVal = envObj.values[i];
      if(envVal.key == key){
        addVal = false;
        envVal.value = value;
        envObj.values[i] = envVal;
        i = envObj.values.length;
      }
    }
    if(addVal){
      envVal = {
        "type": "any",
        "value": value,
        "key": key
      };
      envObj.values.push(envVal);
    }
    return envObj;
  }
  return null;
}