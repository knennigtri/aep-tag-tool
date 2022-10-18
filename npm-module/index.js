const newman = require('newman');
const yaml = require('js-yaml');
const fs = require('fs');
var minimist = require("minimist");
var args = minimist(process.argv.slice(2));
var path = require("path");

var REPORTERS = ['emojitrain','junit','html'];

var IO_COLLECTION = "https://www.getpostman.com/collections/c962d6b3b81776a4c4bf";
var EXPORT_COLLECTION = "https://www.getpostman.com/collections/e8287cbeae23e348a791";
// var IMPORT_COLLECTION = "https://www.getpostman.com/collections/c0c463dbe2f98d3b354a";
var DELETE_PROPS = "https://www.getpostman.com/collections/dc9e91b64f454a9b1bac";

//Dev collections
var IMPORT_COLLECTION = "https://www.getpostman.com/collections/2f3dc4c81eb464c21693";

var init = function(yamlExports){
  //TODO remove manual test
  var yamlFile = yamlExports || args.f || 'tests/example-venia-tag/venia.yml';
  //TODO delete setup
  var deletePropStr = "";
  if(args.delete){
    deletePropStr = args.str || "2022";
  }

  var yamlFileDir = path.dirname(path.resolve(yamlFile));
  var file = fs.readFileSync(yamlFile, 'utf8');
  var obj = yaml.loadAll(file)[0];

  console.log("Name: " + obj['property-name']);
  
  authenicateAIO(obj, yamlFileDir, function(yamlObj){
    //TODO export
    
    //import
    createProperty(yamlObj, function(yamlObj){
      installExtension(yamlObj, yamlFileDir, function(yamlObj){
        importDataElements(yamlObj, yamlFileDir, function(yamlObj){
          importRules(yamlObj, yamlFileDir, function(yamlObj){
            publishLibrary(yamlObj, yamlFileDir, function(yamlObj){
              var tagName = "";
              
              var envVals = JSON.parse(JSON.stringify(yamlObj.environment.values));
              var environmentKey = "propFullName";
              for(var element of envVals){
                if(element.key.includes(environmentKey)){
                  console.log(element.value);
                  tagName = element.value;
                }
              }
              console.log("Successfully created tag property: " + tagName);
            });
          });
        });
      });
    });

    //TODO delete

  });
  
  
}

// Runs the Adobe IO Token collection
function authenicateAIO(yamlObj, yamlFileDir, callback){
  newman.run({
    collection: IO_COLLECTION,
    environment: path.resolve(yamlFileDir, yamlObj.environment),
    reporters: REPORTERS
  }).on('done', function (err, summary) {
    if (err) { throw err; }
    yamlObj.environment = summary.environment;
    console.log('Connected to IO');

    if(summary.run.failures == ""){
      callback(yamlObj);
    }
  });
}

// Runs the Import Tag collection folder "Create Tag Property"
function createProperty(yamlObj, callback){
  newman.run({
    collection: IMPORT_COLLECTION,
    environment: yamlObj.environment,
    folder: "Create Tag Property",
    envVar: [{
      "key": "propName",
      "value": yamlObj['property-name']
    }],
    reporters: REPORTERS
  }).on('done', function (err, summary) {
    if (err) { throw err; }
    // Get the resulting environment with the token
    yamlObj.environment = summary.environment;
    if(summary.run.failures == ""){
      console.log('Created Tag Property!'); //TODO move this and make better
      callback(yamlObj);
    } else {
      console.error("Failed");
      //TODO handle
    }
  });
}

// Runs the Import Tag collection folder "Add Tag Extensions"
function installExtension(yamlObj, yamlFileDir, callback){
  newman.run({
    collection: IMPORT_COLLECTION,
    environment: yamlObj.environment,
    globals: path.resolve(yamlFileDir, yamlObj.globals),
    folder: "Add Tag Extensions",
    iterationData: path.resolve(yamlFileDir, yamlObj.extensions),
    reporters: REPORTERS
  }).on('done', function (err, summary) {
    if (err) { throw err; }
    if(summary.run.failures == ""){
      console.log('Installed Extensions!'); //TODO move this and make better
      callback(yamlObj);
    } else {
      console.error("Failed");
      //TODO Handle
    }
    
  });
}

// Runs the Import Tag collection folder "Add Tag Data Elements"
function importDataElements(yamlObj, yamlFileDir, callback){
  newman.run({
    collection: IMPORT_COLLECTION,
    environment: yamlObj.environment,
    globals: path.resolve(yamlFileDir, yamlObj.globals),
    folder: "Add Tag Data Elements",
    iterationData: path.resolve(yamlFileDir, yamlObj['data-elements']),
    reporters: REPORTERS
  }).on('done', function (err, summary) {
    if (err) { throw err; }
    // console.log(JSON.stringify(summary.environment, null, 2));
    
    if(summary.run.failures == ""){
      console.log('Imported Data Elements!'); //TODO move this and make better
      callback(yamlObj);
    } else {
      console.error("Failed");
      //TODO Handle
    }

  });
}

/** Recursive function to 
 *  - grab yamlObj.rules[0]
 *  - delete yamlObj.rules[0]
 *  - run newman and recurse yamlObj.rules
 *  - recursion breaks when all rules are deleted
 */
function importRules(yamlObj, yamlFileDir, callback){
  var ruleName = Object.keys(yamlObj.rules)[0];
  var ruleCmps = Object.values(yamlObj.rules)[0];

  //Break recursion if there are no rules left
  if(ruleName === undefined){
    callback(yamlObj);
  } else {
    //remove rule from yamlObj
    delete yamlObj.rules[ruleName];

    //run newman to create new rule
    newman.run({
      collection: IMPORT_COLLECTION,
      environment: yamlObj.environment,
      globals: path.resolve(yamlFileDir, yamlObj.globals),
      folder: "Add Tag Rule and CMPs",
      envVar: [{
        "key": "ruleName",
        "value": ruleName
      }],
      iterationData: path.resolve(yamlFileDir, ruleCmps),
      reporters: REPORTERS
    }).on('done', function (err, summary) {
      if (err) { throw err; }
      // console.log(JSON.stringify(summary.environment, null, 2));
      
      if(summary.run.failures == ""){
        console.log('Imported Rule: ' + ruleName);
      } else {
        console.error("Rule Failed: " + ruleName);
      }
      //recurse to the next rule
      importRules(yamlObj, yamlFileDir, callback);
    });
  }
}

// Runs the Import Tag collection folder "Publish Tag Library"
function publishLibrary(yamlObj, yamlFileDir, callback){
  newman.run({
    collection: IMPORT_COLLECTION,
    environment: yamlObj.environment,
    globals: path.resolve(yamlFileDir, yamlObj.globals),
    folder: "Publish Tag Library",
    reporters: REPORTERS
  }).on('done', function (err, summary) {
    if (err) { throw err; }


  
    if(summary.run.failures == ""){
      console.log("Tag Property published successfully!");
      callback(yamlObj);
    } else {
      console.error("Publishing Failed");
      //TODO handle
    }
  });
}

exports.run = init;