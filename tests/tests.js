"use strict";
var init = require("../index.js");
var minimist = require("minimist");
var args = minimist(process.argv.slice(3));

test(args.hideconsole);

/*
    aep-tag-tool -e environments/vLab7.postman_environment.json -g environments/vLab7-tutorial.postman-globals.json -f tests/venia-tag/venia-config.yml --import
    aep-tag-tool -e environments/vLab7.postman_environment.json -g environments/vLab7-tutorial.postman-globals.json -f tests/tutorial-tag/tutorial-config.yml --import
*/

async function test(hideconsole){

   // Hide console logs
   if(hideconsole){
    console.log = function() {};
  }

  //TODO Write Tests

}