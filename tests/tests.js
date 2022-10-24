"use strict";
var init = require("../index.js");
var minimist = require("minimist");
var args = minimist(process.argv.slice(3));

test(args.hideconsole);

async function test(hideconsole){

   // Hide console logs
   if(hideconsole){
    console.log = function() {};
  }

  //TODO Write Tests

}