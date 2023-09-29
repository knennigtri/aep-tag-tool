"use strict";
// var tagTool = require("../index.js");
const fs = require('fs').promises;
var importObject = require("../importObjectUtil.js");
var minimist = require("minimist");
var args = minimist(process.argv.slice(3));
const debug = require("debug");
const debugTests = debug("tests");

//Tests parser.js
async function test(){
  const file = await readJsonFile("tests/empty-ext-simple.json");
  var obj = await importObject.updateSettings(file,"tests/vlab2-settings.yml");

  let newFile = "tests/updatedImportObj.json";
  await writeJsonFile(newFile, obj);
  debugTests("Modified JSON data written to " + newFile);
};
async function readJsonFile(importPath) {
  const data = await fs.readFile(importPath, 'utf8');
  return JSON.parse(data);
}
async function writeJsonFile(importPath, data) {
  await fs.writeFile(importPath, JSON.stringify(data, null, 2));
}
test(); 

// test(args.hideconsole);

// /*
//     aep-tag-tool -e environments/vLab7.postman_environment.json -g environments/vLab7-tutorial.postman-globals.json -f tests/venia-tag/venia-config.yml --import
//     aep-tag-tool -e environments/vLab7.postman_environment.json -g environments/vLab7-tutorial.postman-globals.json -f tests/tutorial-tag/tutorial-config.yml --import
// */

// async function test(hideconsole){

//   // Hide console logs
//   if(hideconsole){
//     console.log = function() {};
//   }

//   //TODO Write Tests
//   /*
//   tagTool.run(tagTool.modes.import, 
//     "tests/venia-tag/venia-config.yml", 
//     "environments/vLab7.postman_environment.json", 
//     "environments/vLab7-tutorial.postman-globals.json", 
//     "PR000000000", 
//     "2022");
//     */
// }