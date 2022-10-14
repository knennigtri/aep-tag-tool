const newman = require('newman');
const yaml = require('js-yaml');
const fs = require('fs');
var minimist = require("minimist");
var args = minimist(process.argv.slice(2));
var path = require("path");

var IO_COLLECTION = "https://www.getpostman.com/collections/c962d6b3b81776a4c4bf";
var EXPORT_COLLECTION = "https://www.getpostman.com/collections/e8287cbeae23e348a791";
// var IMPORT_COLLECTION = "https://www.getpostman.com/collections/c0c463dbe2f98d3b354a";
var DELETE_PROPS = "https://www.getpostman.com/collections/dc9e91b64f454a9b1bac";

//Dev collections
var IMPORT_COLLECTION = "https://www.getpostman.com/collections/2f3dc4c81eb464c21693";

var init = function(yamlExports){
  //TODO remove manual test
  var yamlFile = yamlExports || args.f || '../example-venia-tag/venia.yml';
  
  //TODO delete setup
  var deletePropStr = "";
  if(args.delete){
    deletePropStr = args.str || "2022";
  }

  var yamlFileDir = path.dirname(path.resolve(yamlFile));
  var file = fs.readFileSync(yamlFile, 'utf8');
  var obj = yaml.loadAll(file)[0];

  console.log("Name: " + obj['property-name']);

  // console.log(obj.rules);

  // for (var [key, value] of Object.entries(obj.rules)){
  //   console.log(key);
  //   console.log(value);
  // }

  // Authenticate with Adobe IO
  newman.run({
      collection: IO_COLLECTION,
      environment: path.resolve(yamlFileDir, obj.environment),
      reporters: 'cli'
  }).on('done', function (err, summary) {
    if (err) { throw err; }
    obj.environment = summary.environment;
    console.log('Connected to IO');
    if(summary.run.failures == ""){
      createProperty(obj, yamlFileDir);
    }
  });
}

//Create a tag property
function createProperty(yamlObj, yamlFileDir){
  
  newman.run({
    collection: IMPORT_COLLECTION,
    environment: yamlObj.environment,
    folder: "Create Tag Property",
    envVar: [{
      "key": "propName",
      "value": yamlObj['property-name']
    }],
    reporters: 'cli'
  }).on('done', function (err, summary) {
    if (err) { throw err; }
    // console.log(JSON.stringify(summary.environment, null, 2));

    yamlObj.environment = summary.environment;
    if(summary.run.failures == ""){
      console.log('Created Tag Property!');
      installExtension(yamlObj, yamlFileDir);
    } else {
      console.error("Failed");
    }
  });
}

// Need propID
function installExtension(yamlObj, yamlFileDir){
  // newman run $IMPORT_COLLECTION -e $ENVIRONMENT -g $GLOBALS --folder "Add Tag Extensions" -d $EXT_JSON --env-var "propID=$propID"
  newman.run({
    collection: IMPORT_COLLECTION,
    environment: yamlObj.environment,
    globals: path.resolve(yamlFileDir, yamlObj.globals),
    folder: "Add Tag Extensions",
    iterationData: path.resolve(yamlFileDir, yamlObj.extensions),
    reporters: 'cli'
  }).on('done', function (err, summary) {
    if (err) { throw err; }
    console.log(JSON.stringify(yamlObj.environment,null,2));
    if(summary.run.failures == ""){
      console.log('Installed Extensions!');
      importDataElements(yamlObj, yamlFileDir);
    } else {
      console.error("Failed");
    }
    
  });
}

function importDataElements(yamlObj, yamlFileDir){
  // newman run $IMPORT_COLLECTION -e $ENVIRONMENT -g $GLOBALS --folder "Add Tag Data Elements" -d $DE_JSON --env-var "propID=$propID"

  newman.run({
    collection: IMPORT_COLLECTION,
    environment: yamlObj.environment,
    globals: path.resolve(yamlFileDir, yamlObj.globals),
    folder: "Add Tag Data Elements",
    iterationData: path.resolve(yamlFileDir, yamlObj['data-elements']),
    reporters: 'cli'
  }).on('done', function (err, summary) {
    if (err) { throw err; }
    // console.log(JSON.stringify(summary.environment, null, 2));
    
    if(summary.run.failures == ""){
      console.log('Imported Data Elements!');
      importRules(yamlObj, yamlFileDir);
    } else {
      console.error("Failed");
    }

  });
}

function importRules(yamlObj, yamlFileDir){
  // for ((i = 0; i < ${#RULECMP_JSONS[@]}; i++))
  // do
  //   newman run $IMPORT_COLLECTION -e $ENVIRONMENT -g $GLOBALS --folder "Add Tag Rule and CMPs" -d ${RULECMP_JSONS[$i]} --env-var "propID=$propID" --env-var "ruleName=${RULENAMES[$i]}"
  // done
  var noError = true;
  for (var [ruleName, ruleCmps] of Object.entries(yamlObj.rules)){
    if(noError){

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
        reporters: 'cli'
      }).on('done', function (err, summary) {
        if (err) { throw err; }
        // console.log(JSON.stringify(summary.environment, null, 2));
        
        if(summary.run.failures == ""){
          console.log('Imported Rule: ' + ruleName);
        } else {
          noError = false;
          console.error("Rule Failed: " + ruleName);
        }

      });
    } else {
      console.log("Skipping '" + ruleName + "' due to Error");
    }
  }
  if(noError){
    console.log("Rules successfully imported!");
    publishLibrary(yamlObj, yamlFileDir);
  } else {
    console.error("Failure on Rules");
  }
}

//TODO
function publishLibrary(yamlObj, yamlFileDir){
  //newman run $IMPORT_COLLECTION -e $ENVIRONMENT -g $GLOBALS --folder "Publish Tag Library" --env-var "propID=$propID"
  console.log("Time for publishing!");
}

exports.run = init;