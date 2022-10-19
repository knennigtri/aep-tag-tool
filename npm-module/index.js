const newman = require('newman');
const yaml = require('js-yaml');
const fs = require('fs');
var minimist = require("minimist");
var args = minimist(process.argv.slice(2));
var path = require("path");

var REPORTERS = ['emojitrain','junit', 'html'];


var IO_COLLECTION = "https://www.getpostman.com/collections/c962d6b3b81776a4c4bf";
var EXPORT_COLLECTION = "https://www.getpostman.com/collections/e8287cbeae23e348a791";
var IMPORT_COLLECTION = "https://www.getpostman.com/collections/c0c463dbe2f98d3b354a";
var DELETE_PROPS = "https://www.getpostman.com/collections/dc9e91b64f454a9b1bac";

//Development commands
IMPORT_COLLECTION = "https://www.getpostman.com/collections/2f3dc4c81eb464c21693";
DELETE_PROPS = "https://www.getpostman.com/collections/357a7d9bea644bfc5b46";
EXPORT_COLLECTION = "https://www.getpostman.com/collections/55520565b0f9933b5cf8";
// REPORTERS = ['cli','junit', 'html'];

var TIMESTAMP = formatDateTime();

var init = function(yamlExports){

  var yamlFile = yamlExports || args.f;
  if(!yamlFile){
    console.log("No file specified");
    //TODO add help
    return;
  }

  var fileContents = fs.readFileSync(yamlFile, 'utf8');
  var jsonObj = "";
  try {
    //Attempt to read the YAML and output JSON
    var data = yaml.loadAll(fileContents,"json");
    var yamlContents = JSON.stringify(data[0], null, 2);
    jsonObj = JSON.parse(yamlContents);
  } catch {
    console.log("Could not read YAML, attemping JSON");
    try {
      //Attempt to read JSON
      jsonObj = JSON.parse(fileContents);
    } catch(e){
      console.log("File does not contain valid YAML or JSON content.");
      throw e;
    }
  }

  console.log("Name: " + jsonObj.propertyName);
  var yamlFileDir = path.dirname(path.resolve(yamlFile));
  authenicateAIO(jsonObj, yamlFileDir, function(err, yamlObj){
    if(err) throw err;
    console.log('Connected to AIO');

    if(args.export){
      exportTag(yamlObj, yamlFileDir, function(err, yamlObj){
        if(err) throw err;
        console.log('Exported Tag property!');
      });

    } else if(args.import){ // import tag
      createProperty(yamlObj, yamlFileDir, function(err, yamlObj){
        if(err) throw err;
        console.log('Created Tag Property!');

        installExtension(yamlObj, yamlFileDir, function(err, yamlObj){
          if(err) throw err;
          console.log('Installed Extensions!');
          importDataElements(yamlObj, yamlFileDir, function(err, yamlObj){
            if(err) throw err;
            console.log('Imported Data Elements!');
            importRules(yamlObj, yamlFileDir, function(err, yamlObj){
              if(err) throw err;
          
              publishLibrary(yamlObj, yamlFileDir, function(err, yamlObj){
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

    } else if(args.delete){
      var deletePropStr = "";
      if(typeof args.delete == "boolean") deletePropStr = "2022";
      else deletePropStr = args.delete;
      console.log("Time to delete tags that contain: " + deletePropStr);
      deleteTags(yamlObj, yamlFileDir, deletePropStr, function(err, results){
        if(err) throw err;
        console.log("All tag propertys deleted with: " + deletePropStr);
      });
    } else {
      console.log("No mode selected");
      //TODO add help
    }

  });
  
}

// Runs the Adobe IO Token collection
function authenicateAIO(yamlObj, workingDir, callback){
  const name = "auth";
  const reportName = TIMESTAMP +"-"+ name + "-Report";

  newman.run({
    collection: IO_COLLECTION,
    environment: path.resolve(workingDir, yamlObj.environment),
    reporters: REPORTERS,
    reporter: {
      'html': { export: workingDir+"/"+"newman/"+reportName+".html" },
      'junit': { export: workingDir+"/"+"newman/"+reportName+".xml" }}
  }).on('done', function (err, summary) {
    if (err) { callback(err, false) }
    
    yamlObj.environment = summary.environment;
    if(summary.run.failures == ""){
      callback(null, yamlObj, summary);
    } else {
      callback(new Error("Collection Run Failures"), null, summary);
    }
  });
}

// Runs the Import Tag collection folder "Create Tag Property"
function createProperty(yamlObj, workingDir, callback){
  const name = "createProp";
  const reportName = TIMESTAMP +"-"+ name + "-Report";
  newman.run({
    collection: IMPORT_COLLECTION,
    environment: yamlObj.environment,
    folder: "Create Tag Property",
    envVar: [{
      "key": "propName",
      "value": yamlObj.propertyName
    }],
    reporters: REPORTERS,
    reporter: {
      'html': { export: workingDir+"/"+"newman/"+reportName+".html" },
      'junit': { export: workingDir+"/"+"newman/"+reportName+".xml" }}
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
function installExtension(yamlObj, workingDir, callback){
  const name = "installExts";
  const reportName = TIMESTAMP +"-"+ name + "-Report";
  const iterationData = getIterationData(yamlObj.extensions, workingDir, name);
  
  newman.run({
    collection: IMPORT_COLLECTION,
    environment: yamlObj.environment,
    globals: path.resolve(workingDir, yamlObj.globals),
    folder: "Add Tag Extensions",
    iterationData: iterationData,
    reporters: REPORTERS,
    reporter: {
      'html': { export: workingDir+"/"+"newman/"+reportName+".html" },
      'junit': { export: workingDir+"/"+"newman/"+reportName+".xml" }}
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
function importDataElements(yamlObj, workingDir, callback){
  const name = "installDataElements";
  const reportName = TIMESTAMP +"-"+ name + "-Report";
  const iterationData = getIterationData(yamlObj.dataElements, workingDir, name);

  newman.run({
    collection: IMPORT_COLLECTION,
    environment: yamlObj.environment,
    globals: path.resolve(workingDir, yamlObj.globals),
    folder: "Add Tag Data Elements",
    iterationData: iterationData,
    reporters: REPORTERS,
    reporter: {
      'html': { export: workingDir+"/"+"newman/"+reportName+".html" },
      'junit': { export: workingDir+"/"+"newman/"+reportName+".xml" }}
  }).on('done', function (err, summary) {
    if (err) { throw err; }
    // console.log(JSON.stringify(summary.environment, null, 2));
    
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
function importRules(yamlObj, workingDir, callback){
  var ruleName = Object.keys(yamlObj.rules)[0];
  var ruleCmps = Object.values(yamlObj.rules)[0];
  const name = ruleName;
  const reportName = TIMESTAMP +"-"+ name + "-Report";
  const iterationData = getIterationData(ruleCmps, workingDir, name);

  //Break recursion if there are no rules left
  if(ruleName === undefined){
    callback(null, yamlObj);
  } else {
    //remove rule from yamlObj
    delete yamlObj.rules[ruleName];

    //run newman to create new rule
    newman.run({
      collection: IMPORT_COLLECTION,
      environment: yamlObj.environment,
      globals: path.resolve(workingDir, yamlObj.globals),
      folder: "Add Tag Rule and CMPs",
      envVar: [{
        "key": "ruleName",
        "value": ruleName
      }],
      iterationData: iterationData,
      reporters: REPORTERS,
      reporter: {
      'html': { export: workingDir+"/"+"newman/"+reportName+".html" },
      'junit': { export: workingDir+"/"+"newman/"+reportName+".xml" }}
    }).on('done', function (err, summary) {
      if (err) { throw err; }
      
      if(summary.run.failures == ""){
        console.log('Imported Rule: ' + ruleName);
      } else {
        callback(new Error("Collection Run Failures"), null);
      }
      //recurse to the next rule
      importRules(yamlObj, workingDir, callback);
    });
  }
}

// Runs the Import Tag collection folder "Publish Tag Library"
function publishLibrary(yamlObj, workingDir, callback){
  const name = "publishLib";
  const reportName = TIMESTAMP +"-"+ name + "-Report";
  newman.run({
    collection: IMPORT_COLLECTION,
    environment: yamlObj.environment,
    globals: path.resolve(workingDir, yamlObj.globals),
    folder: "Publish Tag Library",
    reporters: REPORTERS,
    reporter: {
      'html': { export: workingDir+"/"+"newman/"+reportName+".html" },
      'junit': { export: workingDir+"/"+"newman/"+reportName+".xml" }}
  }).on('done', function (err, summary) {
    if (err) { throw err; }

    if(summary.run.failures == ""){
      callback(null, yamlObj, summary);
    } else {
      callback(new Error("Collection Run Failures"), null, summary);
    }
  });
}

function deleteTags(yamlObj, workingDir, str, callback){
  const name = "deleteTags";
  const reportName = TIMESTAMP +"-"+ name + "-Report";
  newman.run({
    collection: DELETE_PROPS,
    environment: yamlObj.environment,
    envVar: [{
      "key": "tagNameIncludes",
      "value": str
    }],
    reporters: REPORTERS,
    reporter: {
      'html': { export: workingDir+"/"+"newman/"+reportName+".html" },
      'junit': { export: workingDir+"/"+"newman/"+reportName+".xml" }}
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
      "value": yamlObj.exportPropID
    }],
    reporters: REPORTERS,
    reporter: {
      'html': { export: workingDir+"/"+"newman/"+reportName+".html" },
      'junit': { export: workingDir+"/"+"newman/"+reportName+".xml" }}
  }).on('done', function (err, summary) {
    if (err) { throw err; }
    if(summary.run.failures == ""){
      let tagExport = {};
      tagExport.extensions = getEnvironmentValue(summary.environment, "exportExtensions");
      tagExport.dataElements = getEnvironmentValue(summary.environment, "exportDataElements");
      tagExport.ruleNames = getEnvironmentValue(summary.environment, "exportRules");
      // fs.writeFileSync('./env.json', JSON.stringify(summary.environment, null, 2) , 'utf-8');
      tagExport.rules = {};
      for(var element in tagExport.ruleNames){
        let ruleName = tagExport.ruleNames[element].attributes.name
        // console.log(tagExport.ruleNames[element].attributes.name);
        tagExport.rules[ruleName] = getEnvironmentValue(summary.environment, "exportRuleCmps-"+element);
      }

      //TODO pull out propertyName from Export to write
      propertyName = "export";
      //Write to a file
      fs.writeFileSync(workingDir+"/"+propertyName+".json", JSON.stringify(tagExport,null,2));
      fs.writeFileSync(workingDir+"/"+propertyName+".yml", yaml.dump(tagExport));


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

function getIterationData(iterationData, rootDir, dataName){
  try {
    if(typeof iterationData == "string"){
      let absPath = path.resolve(rootDir, iterationData);
      if(fs.existsSync(iterationData)){
        return absPath;
      }
    } else {
      return iterationData;
    }
  } catch (err){
    // callback(err, "Iteration Data for "+dataName+ " does not exist.");
    return err;
  }
}

exports.run = init;