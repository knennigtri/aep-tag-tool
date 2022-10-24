const newman = require("newman");
const fs = require("fs");
const debug = require("debug");
const debugNewman = require("debug")("newmanTF");
const debugCollections = require("debug")("newmanTF:collections");
// let IO_COLLECTION = require("./collections/Adobe IO Token.postman_collection.json")

let REPORTERS = ["emojitrain","junit", "html"];
let IO_COLLECTION = require("./collections/Adobe IO Token.postman_collection.json");
let EXPORT_COLLECTION = require("./collections/Export Tag Property.postman_collection.json");
let IMPORT_COLLECTION = require("./collections/Import Tag Property.postman_collection.json");
let DELETE_PROPS = require("./collections/Delete Properties.postman_collection.json");

//Development commands
if(debug.enabled("newmanTF:collections")){
  debugCollections("Using Postman Collections");
  IO_COLLECTION = require("https://www.getpostman.com/collections/6ad99074fc75d564ac8a");
  IMPORT_COLLECTION = require("https://www.getpostman.com/collections/2f3dc4c81eb464c21693");
  DELETE_PROPS = require("https://www.getpostman.com/collections/357a7d9bea644bfc5b46");
  EXPORT_COLLECTION = require("https://www.getpostman.com/collections/55520565b0f9933b5cf8");
  // REPORTERS = ['cli','junit', 'html'];
}

let TIMESTAMP = formatDateTime();
let reportersDir = "newman/";

exports.exportTag = function exportTag(configObj, workingDir, callback){
  const name = "exportTag";

  authenicateAIO(configObj, function(err, exportObj){
    if(err) throw err;
    const reportName = TIMESTAMP +"-"+ name + "-Report";
    newman.run({
      collection: EXPORT_COLLECTION,
      environment: exportObj.environment,
      envVar: [{
        "key": "propID",
        "value": exportObj.export.propID
      }],
      reporters: REPORTERS,
      reporter: {
        "html": { export: reportersDir+reportName+".html" },
        "junit": { export: reportersDir+reportName+".xml" }}
    }).on("done", function (err, summary) {
      if (err) { throw err; }
      if(summary.run.failures == ""){
        let tagExport = {};
        tagExport.import = {};
        tagExport.import.propertyName = getEnvironmentValue(summary.environment, "exportPropName");
        tagExport.import.extensions = getEnvironmentValue(summary.environment, "exportExtensions");
        tagExport.import.dataElements = getEnvironmentValue(summary.environment, "exportDataElements");
        tagExport.import.ruleNames = getEnvironmentValue(summary.environment, "exportRules");
        tagExport.import.rules = {};
        for(var element in tagExport.import.ruleNames){
          let ruleName = tagExport.import.ruleNames[element].attributes.name;
          tagExport.import.rules[ruleName] = getEnvironmentValue(summary.environment, "exportRuleCmps-"+element);
        }

        //Write to a file
        var propName = tagExport.import.propertyName.replace(/\s+/g, "-").toLowerCase();
        fs.writeFileSync(workingDir+"/"+propName+".json", JSON.stringify(tagExport,null,2));
        // fs.writeFileSync(workingDir+"/"+propName+".yml", yaml.dump(tagExport));

        callback(null, exportObj, summary);
      } else {
        callback(summary.run.failures[0].error.stack, null, null);
      }
    });
  });
};

exports.importTag = function importTag(configObj, callback){
  authenicateAIO(configObj, function(err, importObj){
    if(err) throw err;
    createProperty(importObj, function(err, importObj){
      if(err) throw err;
      
      debug("Continuing to importExtensions...");
      installExtension(importObj, function(err, importObj){
        if(err) throw err;

        debug("Continuing to importDataElements...");
        importDataElements(importObj, function(err, importObj){
          if(err) throw err;
          

          debug("Continuing to importRules...");
          importRules(importObj, function(err, importObj){
            if(err) throw err;

            debug("Continuing to publishLibrary...");
            publishLibrary(importObj, function(err, importObj){
              if(err) throw err;
              
              callback(null, importObj);
            });
          });
        });
      });
    });
  });
};

exports.deleteTags = function deleteTags(configObj, searchStr, callback){
  const name = "deleteTags";

  authenicateAIO(configObj, function(err, deleteObj){
    if(err) throw err;
    const reportName = TIMESTAMP +"-"+ name + "-Report";
    newman.run({
      collection: DELETE_PROPS,
      environment: deleteObj.environment,
      envVar: [{
        "key": "tagNameIncludes",
        "value": searchStr
      }],
      reporters: REPORTERS,
      reporter: {
        "html": { export: reportersDir+reportName+".html" },
        "junit": { export: reportersDir+reportName+".xml" }}
    }).on("done", function (err, summary) {
      if (err) { throw err; }
      if(summary.run.failures == ""){
        console.log("All tag propertys deleted with: " + deleteObj.delete.searchStr);
        callback(null, deleteObj, summary);
      } else {
        callback(summary.run.failures[0].error.stack, null, null);
      }
    });
  });
};

// Runs the Import Tag collection folder "Create Tag Property"
function createProperty(propertyObj, callback){
  const name = "createProp";
  const reportName = TIMESTAMP +"-"+ name + "-Report";
  const folder = "Create Tag Property";

  newman.run({
    collection: IMPORT_COLLECTION,
    environment: propertyObj.environment,
    folder: folder,
    envVar: [{
      "key": "propName",
      "value": propertyObj.import.propertyName
    }],
    reporters: REPORTERS,
    reporter: {
      "html": { export: reportersDir+reportName+".html" },
      "junit": { export: reportersDir+reportName+".xml" }}
  }).on("done", function (err, summary) {
    if (err) { throw err; }
    
    propertyObj.environment = summary.environment; // Update with propID
    if(summary.run.failures == ""){
      console.log("Created Tag Property! PropID="+getEnvironmentValue(summary.environment, "propID"));
      callback(null, propertyObj, summary);
    } else {
      callback(summary.run.failures[0].error.stack, null, null);
    }
  });
}

// Runs the Import Tag collection folder "Add Tag Extensions"
function installExtension(extensionsObj, callback){
  const name = "installExts";
  const reportName = TIMESTAMP +"-"+ name + "-Report";
  const folder = "Add Tag Extensions";
  
  newman.run({
    collection: IMPORT_COLLECTION,
    environment: extensionsObj.environment,
    globals: extensionsObj.globals,
    folder: folder,
    iterationData: extensionsObj.import.extensions,
    reporters: REPORTERS,
    reporter: {
      "html": { export: reportersDir+reportName+".html" },
      "junit": { export: reportersDir+reportName+".xml" }}
  }).on("done", function (err, summary) {
    if (err) { throw err; }
    if(summary.run.failures == ""){
      console.log("Installed Extensions!");
      callback(null, extensionsObj, summary);
    } else {
      callback(summary.run.failures[0].error.stack, null, null);
    }
    
  });
}

// Runs the Import Tag collection folder "Add Tag Data Elements"
function importDataElements(dataElementsObj, callback){
  const name = "installDataElements";
  const reportName = TIMESTAMP +"-"+ name + "-Report";
  const folder = "Add Tag Data Elements";

  newman.run({
    collection: IMPORT_COLLECTION,
    environment: dataElementsObj.environment,
    globals: dataElementsObj.globals,
    folder: folder,
    iterationData: dataElementsObj.import.dataElements,
    reporters: REPORTERS,
    reporter: {
      "html": { export: reportersDir+reportName+".html" },
      "junit": { export: reportersDir+reportName+".xml" }}
  }).on("done", function (err, summary) {
    if (err) { throw err; }
    
    if(summary.run.failures == ""){
      console.log("Imported Data Elements!");
      callback(null, dataElementsObj, summary);
    } else {
      callback(summary.run.failures[0].error.stack, null, null);
    }

  });
}

/** Recursive function to 
 *  - grab yamlObj.rules[0]
 *  - delete yamlObj.rules[0]
 *  - run newman and recurse yamlObj.rules
 *  - recursion breaks when all rules are deleted
 */
function importRules(rulesObj, callback){
  var ruleName = Object.keys(rulesObj.import.rules)[0];
  var ruleCmps = Object.values(rulesObj.import.rules)[0];
  const name = ruleName;
  const reportName = TIMESTAMP +"-"+ name + "-Report";
  const folder = "Add Tag Rule and CMPs";

  //Break recursion if there are no rules left
  if(ruleName === undefined){
    callback(null, rulesObj);
  } else {
    //remove rule from yamlObj
    delete rulesObj.import.rules[ruleName];

    //run newman to create new rule
    newman.run({
      collection: IMPORT_COLLECTION,
      environment: rulesObj.environment,
      globals: rulesObj.globals,
      folder: folder,
      envVar: [{
        "key": "ruleName",
        "value": ruleName
      }],
      iterationData: ruleCmps,
      reporters: REPORTERS,
      reporter: {
        "html": { export: reportersDir+reportName+".html" },
        "junit": { export: reportersDir+reportName+".xml" }}
    }).on("done", function (err, summary) {
      if (err) { throw err; }
      
      if(summary.run.failures == ""){
        console.log("Imported Rule: " + ruleName);
      } else {
        callback(summary.run.failures[0].error.stack, null, null);
      }
      //recurse to the next rule
      importRules(rulesObj, callback);
    });
  }
}

// Runs the Import Tag collection folder "Publish Tag Library"
function publishLibrary(publishObj, callback){
  const name = "publishLib";
  const reportName = TIMESTAMP +"-"+ name + "-Report";
  const folder = "Publish Tag Library";

  newman.run({
    collection: IMPORT_COLLECTION,
    environment: publishObj.environment,
    globals: publishObj.globals,
    folder: folder,
    reporters: REPORTERS,
    reporter: {
      "html": { export: reportersDir+reportName+".html" },
      "junit": { export: reportersDir+reportName+".xml" }}
  }).on("done", function (err, summary) {
    if (err) { throw err; }

    if(summary.run.failures == ""){
      console.log("Tag Property published successfully!");
      callback(null, publishObj, summary);
    } else {
      callback(summary.run.failures[0].error.stack, null, null);
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
      "html": { export: reportersDir+reportName+".html" },
      "junit": { export: reportersDir+reportName+".xml" }}
  }).on("done", function (err, summary) {
    if (err) { callback(err, false); }
    
    yamlObj.environment = summary.environment; // Update with AIO token
    if(summary.run.failures == ""){
      console.log("Connected to AIO");
      callback(null, yamlObj, summary);
    } else {
      callback(summary.run.failures[0].error.stack, null, null);
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
  var min = (d.getMinutes() < 10 ? "0" : "") + d.getMinutes();
  var time = year + "-" + month + "-" + date + "-" + hour + ":" + min;
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


