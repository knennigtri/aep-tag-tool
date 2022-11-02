const newman = require("newman");
const fs = require("fs");
const debug = require("debug");
const debugCollections = require("debug")("newmanTF:collections");

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

exports.importTag = function importTag(configObj, callback) {
  authenicateAIO(configObj.environment, configObj)
    .then((resultEnv) => createProperty(resultEnv, configObj))
    .then((resultEnv) => installExtensions(resultEnv, configObj))
    .then((resultEnv) => importDataElements(resultEnv, configObj))
    .then((resultEnv) => importRules(resultEnv, configObj))
    .then((resultEnv) => publishLibrary(resultEnv, configObj))
    .then( function(resultEnv){
      let prodArtifactURL = getEnvironmentValue(resultEnv, "prodArtifactURL");
      console.log("Prod Library embed code: ");
      console.log("<script src='"+prodArtifactURL+"' async></script>");
      callback(null, resultEnv);
    })
    .catch(err => console.error(err));
};

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

// Runs the Import Tag collection folder "Publish Tag Library"
function publishLibrary(environment, configObj) {
  return newmanRun("publishLib", 
      environment, configObj.globals, 
      IMPORT_COLLECTION, "Publish Tag Library", 
      "", "");
}

/******* Helper Functions ******/

function newmanRun(cmdName, env, globals, collection, folder, data, envVar){
  const reportName = TIMESTAMP + "-" + cmdName + "-Report";
  // const folder = "Add Tag Rule and CMPs";
  if(folder && folder != ""){
    console.log("Running: " + folder + " for: " + cmdName)
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
      // console.log(element.value);
      return element.value;
    }
  }
  return "";
}