const newman = require("newman");
const pmEnv = require("./pmEnvironment.js");
const parserUtil = require("./parserUtil.js");
const fs = require("fs");
const path = require("path");
//https://www.npmjs.com/package/debug
//Mac: DEBUG=* aep-tag-tool....
//WIN: set DEBUG=* & aep-tag-tool....
const debug = require("debug");
const debugCollections = require("debug")("collections");
const debugNewman = require("debug")("newman");
require("debug")("newman:cli");
exports.debugOptions = {
  "collections": "Postman collection messages",
  "newman": "Newman command messages",
  "newman:cli": "Newman cli output for verbose messaging of collections"
};

let REPORTERS = ["emojitrain", "junit"];
let IO_OAUTH_COLLECTION = require("./postman/Adobe IO Token OAuth.postman_collection.json");
let IO_JWT_COLLECTION = require("./postman/Adobe IO Token.postman_collection.json");
let EXPORT_COLLECTION = require("./postman/Export Tag Property.postman_collection.json");
let IMPORT_COLLECTION = require("./postman/Import Tag Property.postman_collection.json");
let DELETE_PROPS = require("./postman/Delete Properties.postman_collection.json");

//Development commands
// if (debug.enabled("collections")) {
//   debugCollections("Using Postman Collections");
//   IO_OAUTH_COLLECTION = "";
//   IO_JWT_COLLECTION = "https://www.getpostman.com/collections/6ad99074fc75d564ac8a";
//   IMPORT_COLLECTION = "https://www.getpostman.com/collections/2f3dc4c81eb464c21693";
//   DELETE_PROPS = "https://www.getpostman.com/collections/357a7d9bea644bfc5b46";
//   EXPORT_COLLECTION = "https://www.getpostman.com/collections/55520565b0f9933b5cf8";
// }

//Mac: DEBUG=newman:cli aep-tag-tool....
//WIN: set DEBUG=newman:cli & aep-tag-tool....
if (debug.enabled("newman:cli")) {
  REPORTERS = ["cli", "junit"];
}

let TIMESTAMP = formatDateTime();
let reportersDir = "bin/newman/logs";

function exportTag(env, pid, exportDir) {
  return authenicateAIO(env)
    .then((resultEnv) => newmanRun("exportTag",
      resultEnv, "",
      EXPORT_COLLECTION, "",
      "", [{
        "key": "propID",
        "value": pid
      }])
    )
    .then(function (resultEnv) {
      let tagExport = {};
      tagExport.propID = pid;
      tagExport.propertyName = pmEnv.getEnvValue(resultEnv, "exportPropName");
      tagExport.extensions = pmEnv.getEnvValue(resultEnv, "exportExtensions");
      tagExport.dataElements = pmEnv.getEnvValue(resultEnv, "exportDataElements");
      tagExport.ruleNames = pmEnv.getEnvValue(resultEnv, "exportRules");
      tagExport.rules = {};
      for (var element in tagExport.ruleNames) {
        let ruleName = tagExport.ruleNames[element].attributes.name;
        tagExport.rules[ruleName] = pmEnv.getEnvValue(resultEnv, "exportRuleCmps-" + element);
      }
      if (!exportDir) exportDir = ".";
      const fileBase = parserUtil.sanitizeFileBaseName(tagExport.propertyName);
      const outputFile = path.join(exportDir, fileBase + ".json");
      fs.mkdirSync(path.dirname(outputFile), { recursive: true });
      fs.writeFileSync(outputFile, JSON.stringify(tagExport, null, 2));
      return resultEnv;
    });
}

function importTag(env, importObj, actions, globals) {
  return authenicateAIO(env)
    .then(function (resultEnv) { //Add propID if importing to an existing property
      return new Promise(function (resolve, reject) {
        if (!actions) actions = getImportActions();
        if (actions[0] != "C") {
          if (importObj.propID) {
            let env = pmEnv.setEnvValue(resultEnv, "propID", importObj.propID);
            if (env) resolve(env);
            else reject(new Error("Cannot update environment"));
          } else {
            reject(new Error("No propID specified to import into an existing property"));
          }
        } else resolve(resultEnv);
      });
    })
    .then((resultEnv) => recurseImportChain(resultEnv, importObj, actions, globals));
}

function recurseImportChain(environment, importItems, actions, globals) {
  const nextAction = actions.shift();
  if (nextAction) {
    if (nextAction === "C") {
      return createProperty(environment, importItems, globals)
        .then((resultEnv) => recurseImportChain(resultEnv, importItems, actions, globals));
    } else if (nextAction === "E") {
      return installExtensions(environment, importItems, globals)
        .then((resultEnv) => recurseImportChain(resultEnv, importItems, actions, globals));
    } else if (nextAction === "D") {
      return importDataElements(environment, importItems, globals)
        .then((resultEnv) => recurseImportChain(resultEnv, importItems, actions, globals));
    } else if (nextAction === "R") {
      return importRules(environment, importItems, globals)
        .then((resultEnv) => recurseImportChain(resultEnv, importItems, actions, globals));
    } else if (nextAction === "L") {
      return publishLibraryToDev(environment, globals)
        .then((resultEnv) => recurseImportChain(resultEnv, "", actions, globals));
    } else if (nextAction === "P") {
      return publishLibraryToProd(environment, globals)
        .then((resultEnv) => recurseImportChain(resultEnv, "", actions, globals))
        .then(function (resultEnv) {
          let artifactURL = pmEnv.getEnvValue(resultEnv, "prodArtifactURL");
          console.log("Prod Library embed code: ");
          console.log("<script src='" + artifactURL + "' async></script>");
        });
    }
    return recurseImportChain(environment, importItems, actions, globals);
  }
  return Promise.resolve(environment);
}

function deleteTags(env, searchStr) {
  return authenicateAIO(env)
    .then((resultEnv) => newmanRun("deleteTags",
      resultEnv, "",
      DELETE_PROPS, "",
      "", [{
        "key": "tagNameIncludes",
        "value": searchStr
      }])
    );
}

// Runs the Adobe IO Token collection
function authenicateAIO(environment) {
  let auth_method;
  for (let i = 0; i < environment.values.length; i++) {
    if (environment.values[i].key == "AUTH_METHOD") {
      auth_method = environment.values[i].value;
      i = environment.values.length;
    }
  }

  let auth_collection;
  if (auth_method == pmEnv.auth.oauth) {
    auth_collection = IO_OAUTH_COLLECTION;
  } else if (auth_method == pmEnv.auth.jwt) {
    auth_collection = IO_JWT_COLLECTION;
  }
  return newmanRun("auth",
    environment, "",
    auth_collection, "",
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

function importRules(environment, importItems, globals) {
  let env = environment;
  const rules = importItems.rules || {};
  return Object.keys(rules).reduce((chain, rule) => {
    return chain.then(() => newmanRun(rule,
      env,
      globals,
      IMPORT_COLLECTION,
      "Add Tag Rule and CMPs",
      rules[rule],
      [{
        "key": "ruleName",
        "value": rule
      }])
    ).then((resultEnv) => {
      env = resultEnv;
    });
  }, Promise.resolve()).then(() => env);
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

function newmanRun(cmdName, env, globals, collection, folder, data, envVar) {
  var f2 = function (k, v) { return k && v && typeof v !== "number" ? "" + v : v; };
  debugNewman(JSON.stringify(data, f2, 2));

  const reportName = TIMESTAMP + "-" + cmdName + "-Report";
  if (folder && folder != "") {
    console.log("Running: " + folder + " for: " + cmdName);
  } else {
    console.log("Running: " + cmdName);
  }

  debugNewman("ReportNameHTML: " + reportersDir + reportName + ".[html | xml]");
  // Uncomment to generate the final postman environment file
  // console.log(JSON.stringify(env));
  return new Promise(function (resolve, reject) {
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
        "junit": { export: reportersDir + reportName + ".xml" }
      } //TODO investigate saving via Win and Mac
    }).on('console', function (err, o) {
      // console.log(o.messages[o.cursor.iteration]);
    }).on('assertion', function (err, o) {
      if (!err) { return; }
      //TODO Integrate assertions. review Offer collection with mswuser-env 
      // console.log({
      //     "Content": data[o.cursor.iteration]?.title,
      //     "Response": o.assertion,
      //     "Error": o.error.message,
          
      // });
    }).on("done", function (err, summary) {
      if (err) {
        reject(err);
        return;
      }
      const failures = summary.run.failures;
      if (!failures || failures.length === 0) {
        console.log("Success!");
        resolve(summary.environment);
        return;
      }
      reject(new Error("API Failures. Check the report logs in " + reportersDir));
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

function getImportActions(create, extensions, dataElements, rules, libraryToDev, publishToProd) {
  let actions = [];
  if (create || extensions || dataElements || rules || libraryToDev || publishToProd) {
    if (create) actions.push("C");
    if (extensions) actions.push("E");
    if (dataElements) actions.push("D");
    if (rules) actions.push("R");
    if (libraryToDev) actions.push("L");
    if (publishToProd) actions.push("P");
  } else { // create and import everything
    actions = ["C", "E", "D", "R", "L", "P"];
  }
  debugNewman(actions);
  return actions;
}

exports.getImportActions = getImportActions;
exports.exportTag = exportTag;
exports.importTag = importTag;
exports.deleteTags = deleteTags;