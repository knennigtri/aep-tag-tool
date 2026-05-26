const pmEnv = require("./pmEnvironment.js");
const packageInfo = require("./package.json");
const aepTagTool = require("./index.js");
const minimist = require("minimist");
const args = minimist(process.argv.slice(2));
//https://www.npmjs.com/package/debug
//Mac: DEBUG=* aep-tag-tool....
//WIN: set DEBUG=* & aep-tag-tool....
const debug = require("debug");
const debugArgs = debug("args");

const { HELP } = require("./cli-message.js");

const modes = {
  export: "export",
  import: "import",
  delete: "delete"
};

async function init() {
  let mode = "";
  if (args.export || args.e) mode = modes.export;
  if (args.import || args.i) mode = modes.import;
  if (args.delete || args.d) mode = modes.delete;
  const argsEnv = args.config || args.c;
  let argsAuth = pmEnv.auth.oauth; //default is oauth
  if (args.jwt) argsAuth = pmEnv.auth.jwt;
  if (args.oauth) argsAuth = pmEnv.auth.oauth;

  const argsVersion = args.v || args.version;
  const argsHelp = args.h || args.help;

  debugArgs(JSON.stringify(args, null, 2));

  // Show CLI help
  if (argsHelp) {
    const helpType = argsHelp === true ? "default" : String(argsHelp).toLowerCase();
    console.log(HELP[helpType] || HELP.default);
    return;
  }

  // Show version
  if (argsVersion) {
    console.log(packageInfo.version);
    return;
  }

  /** All Modes require an environment */
  if (!argsEnv) {
    console.log("No environment Specified.");
    console.log(HELP.default);
    return;
  }
  //Run the tool
  await aepTagTool.run(argsEnv, argsAuth, mode);
}

exports.init = init;
exports.debugOptions = Object.assign({
  "*": "Output all debugging messages",
  "args": "See CLI argument messages"
}, aepTagTool.debugOptions);
