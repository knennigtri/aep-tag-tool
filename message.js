const packageInfo = require("./package.json");
const index = require("./index.js");
const newman = require("./newman.js");
const launch = require("./launch.js");

const HELP_config = "-c, --config <myconfig.yml>         Specify a config file";
const HELP_F =      "-f, --file   <file>                 [import] file containing import json";
const HELP_T =      "-t, --title  <title>                [import] optional new title of tag property";
const HELP_P =      "-p, --pid    <pid>                  [export, import] property ID";
const HELP_S =      "-s, --search <str>                  [delete] search string for properties deletion";
const HELP_O =      "-o, --output <folder>               [export] folder path to save export property. Default ./";
const HELP_CEDRLP = "-C,-E,-D,-R,-L,-P                   [import] Options to partially import. See -h import";
const HELP_export = "-e, --export <PID>                  Mode to export a given property ID.";
const HELP_import = "-i, --import <propertyFile.json>    Mode to import a property given a config file.";
const HELP_delete = "-d, --delete <searchStr>            Mode to delete properties containing a specific string";
const HELP =
"Usage: "+ packageInfo.name.replace("@knennigtri/", "") + ` [ARGS]
 Arguments:
    ` + HELP_config + `
    ` + HELP_export + `
    ` + HELP_import + `
    ` + HELP_delete + `
    ` + HELP_CEDRLP + `
    ` + HELP_F + `
    ` + HELP_T + `
    ` + HELP_P + `
    ` + HELP_S + `
    ` + HELP_O + `
    -g  <postman_globals.json>          Not supported currently
    -v, --version                       Displays version of this package
    --jwt                               Use if using JWT Auth. Deprecated by Adobe. Default is OAuth.
    -h, --help
               config
               export 
               import
               delete
               debug`;
const CONFIGFILE_EXAMPLE = 
 `In your Adobe IO Project under Credentials click the "Download JSON" button
 For OAuth credentials, make sure the JSON contains at least:
 {
  "ORG_ID": "xxxxxxxxxxxxxxxxxxxxx@AdobeOrg",
  "CLIENT_SECRETS": [ "xxxxxxxxxxxxxxxxxxxxx" ],
  "CLIENT_ID": "xxxxxxxxxxxxxxxxxxxxx",
  "SCOPES": [
    "xxxxxxxxx",
    "xxxxxxxxx",
    "xxxxxxxxx"
  ]
}
 For JWT credentials, download the private key add PRIVATE_KEY:
{
  "CLIENT_SECRET": "xxxxxxxxxxxxxxxxxxx",
  "ORG_ID": "xxxxxxxxxxxxxxxxxxx@AdobeOrg",
  "API_KEY": "xxxxxxxxxxxxxxxxxxx",
  "TECHNICAL_ACCOUNT_ID": "xxxxxxxxxxxxxxxxxxx@techacct.adobe.com",
  "TECHNICAL_ACCOUNT_EMAIL": "xxxxxxxxxxxxxxxxxxx@techacct.adobe.com",
  "PUBLIC_KEYS_WITH_EXPIRY": {
    "xxxxxxxxxxxxxxxxxxx": "01/07/2023",
  }
  "PRIVATE_Key": "location/of/private.key",
}

Alternatively:
Create a myconfig.yml and optionally add an import section to import all listed properties with import mode
---
auth:
  CLIENT_ID: xxxxxxxxxxxxxxxxxxx
  CLIENT_SECRET: xxxxxxxxxxxxxxxxxxx
  ORG_ID: xxxxxxxxxxxxxxxxxxx@AdobeOrg
  SCOPES: [xxxxx, xxxxxx, xxxxx]
import:
  ./propertyOne.json: 
  ./propertyTwo.json: Pxxxxxxxxxxxxxxxxxxx
  ./propertyThree.json:
---
`;
const HELP_EXPORT =
`Mode: Export
Requires:
 ` + HELP_config + `
 ` + HELP_export + `

Optionally include the PID with a parameter
 ` + HELP_P + `

Optionally specify the output folder
 ` + HELP_O + ` 
`;
const HELP_IMPORT =
`Mode: Import
Requires:
 ` + HELP_config + `
 ` + HELP_import + `

Optionally include the property file with a parameter
 ` + HELP_F + `
 ` + HELP_T + `
 ` + HELP_P + `
Note: PID is ignored unless importing to an existing property (-C is omited)

You can specify exactly what you want to create/import with these params. 
No matter the parameter order, they will always execute in the order below.
  -C  Creates a new property.

If -C is not used with the remaining parameters, a PID is required in parameters
  -E  Imports extensions. propertyFile.extensions is required.
  -D  Imports data elements. propertyFile.dataElement is required.
  -R  Imports rule components. propertyFile.rules.[rules] is required.
  -L  Builds a library of all items the Dev environment
  -P  Publishes the library into Prod

Create the tag property file using the export command:
   >  
   ` + packageInfo.name.replace("@knennigtri/", "") + ` -c <configFile> --export <pid>
   `;
const HELP_DELETE =
`Mode: Delete
Requires:
 ` + HELP_config + `
 ` + HELP_delete + `

Optionally include the search string with a parameter
 ` + HELP_S + `
    `;
const HELP_DEBUG =
`Debug options:
  Mac:
    $ DEBUG=<value> aep-tag-tool....
  Win:
    $ set DEBUG=<value> & aep-tag-tool...

  Where <value> can be:
`
  + JSON.stringify(index.debugOptions, null, 2)
    .replaceAll("\": ","     ")
    .replaceAll("\"","")
    .replaceAll(",","")
    .replaceAll("{\n","")
    .replaceAll("}","")
  + JSON.stringify(newman.debugOptions, null, 2)
    .replaceAll("\": ","     ")   
    .replaceAll("\"","")
    .replaceAll(",","")
    .replaceAll("{\n","")
    .replaceAll("}","")
  + JSON.stringify(launch.debugOptions, null, 2)
    .replaceAll("\": ","     ")   
    .replaceAll("\"","")
    .replaceAll(",","")
    .replaceAll("{\n","")
    .replaceAll("}","")
    ;

exports.HELP = HELP;
exports.CONFIGFILE_EXAMPLE = CONFIGFILE_EXAMPLE;
exports.HELP_EXPORT = HELP_EXPORT;
exports.HELP_IMPORT = HELP_IMPORT;
exports.HELP_DELETE = HELP_DELETE;
exports.HELP_DEBUG = HELP_DEBUG;