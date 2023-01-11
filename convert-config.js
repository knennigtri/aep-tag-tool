const newman = require("newman");
const fs = require("fs");
var path = require("path");
const yaml = require("js-yaml");
const debug = require("debug");
const debugData = require("debug")("data");

const POSTMAN_ENV = require("./postman/aep-tag-tool.postman_environment.json");

function create(configYMLFile){
  return new Promise(function(resolve, reject) {
    getJSON(configYMLFile)
      .then((resultObj) => {
        if(!resultObj || !resultObj.auth) reject(new Error("config file doesn't have auth info"));
        // let postmanObj = fs.readFileSync(POSTMAN_ENV, "utf8");
        let postmanObj = POSTMAN_ENV;
        for(let key in resultObj.auth){
          postmanObj = setEnvironmentValue(postmanObj, key, resultObj.auth[key])
          //TODO Bind setting environment values to exactly what's needed for Auth
        }
        debugData(JSON.stringify(postmanObj, null, 2));
      })
      .then((resultObj) => resolve(resultObj))
      .catch((err) => {
        console.log(err);
        return;
      });
  });
}

function getJSON(data) {
  debugData("getJSON: function()");
  let dataFileDir;
  let dataObj = {};
  return new Promise(function(resolve, reject) {
    //Read the config file or assign the object
    if(!data){   //Check if there is a config file/object
      debugData("No data file detected, creating.");
      dataObj = {};
      dataFileDir = "./";
    } else {
      let dataContents;
      // if data is a file string, extract the contents
      if(typeof data == "string"){
        if(fs.lstatSync(data).isFile()){
          data = path.resolve(data);
          dataContents = fs.readFileSync(data, "utf8");
          dataFileDir = path.dirname(data);
        } else {
          reject(new Error("-f parameter is not a file."));
        }
      } else if(typeof data  === "object" && data !== null) {
        dataContents = data;
        dataFileDir = "./";
      } 
      // Parse the dataContents from YAML or JSON
      try {
        //Attempt to read the YAML and output JSON
        let data = yaml.loadAll(dataContents,"json");
        let yamlContents = JSON.stringify(data[0], null, 2);
        dataObj = JSON.parse(yamlContents);
      } catch {
        console.log("Could not read YAML, attemping JSON...");
        try {
          //Attempt to read JSON
          dataObj = JSON.parse(dataContents);
        } catch(err){
          reject(new Error("File does not contain valid YAML or JSON content.",{cause: err.name}));
        }
      }
      debugData(dataObj);
      resolve(dataObj);
    }
  });
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

exports.getJSON = getJSON;
exports.create = create;