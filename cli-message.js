const packageInfo = require("./package.json");
const index = require("./index.js");
const newman = require("./newman.js");
const pmEnv = require("./pmEnvironment.js");

const cliName = packageInfo.name.replace("@knennigtri/", "");

const param_config = "-c, --config <myconfig.yml>         Specify a config file";
const param_T = "-t, --title  <title>                [import] optional new title of tag property";
const param_P = "-p, --pid    <pid>                  [import] import into an existing property ID";
const param_S = "-s, --settings  <settings.yml>      [import] unique property settings for a new org";
const param_CEDRLP = "-C,-E,-D,-R,-L,-P                   [import] Options to partially import. See -h import";
const param_O = "-o, --output <folder>               [export] folder path to save export property. Default ./";
const param_export = "-e, --export <PID>                  Mode to export a given property ID.";
const param_import = "-i, --import <propertyFile.json>    Mode to import a property given a config file.";
const param_delete = "-d, --delete <searchStr>            List or delete properties whose names contain a string";
const param_confirm = "    --confirm                       [delete] perform deletion (default is preview only)";

function formatDebugOpts(obj) {
  return JSON.stringify(obj, null, 2)
    .replaceAll("\": ", "     ")
    .replaceAll("\"", "")
    .replaceAll(",", "")
    .replaceAll("{\n", "")
    .replaceAll("}", "");
}

const HELP_DEBUG =
`Debug options:
  Mac:
    $ DEBUG=<value> ${cliName}....
  Win:
    $ set DEBUG=<value> & ${cliName}...

  Where <value> can be:
`
  + formatDebugOpts(index.debugOptions)
  + formatDebugOpts(newman.debugOptions)
  + formatDebugOpts(pmEnv.debugOptions);

const HELP = {
  default:
    `Usage: ${cliName} [ARGS]
 Arguments:
    ` + param_config + `
    ` + param_export + `
    ` + param_import + `
    ` + param_delete + `
    ` + param_confirm + `
    ` + param_CEDRLP + `
    ` + param_T + `
    ` + param_P + `
    ` + param_S + `
    ` + param_O + `
    -v, --version                       Displays version of this package
    --jwt                               Use if using JWT Auth. Deprecated by Adobe. Default is OAuth.
    -h, --help
               config
               export
               import
               delete
               settings
               debug`,
  config:
    `In your Adobe IO Project under Credentials click the "Download JSON" button,

 OAuth config may be EITHER:
  • Flat OAuth JSON/YAML as below, OR
  • A Developer Console project/workspace JSON (nested project.org plus
    project.workspace.details.credentials[].oauth_server_to_server).

 For OAuth credentials, make sure the JSON contains at least (flat shape):
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
`,
  settings:
    `
When importing into new organizations, some values may need to be changed in the import file.
This is a helper find/replace extension/dataElement settings key/value pairs
to automate import with unique values.
newsettings.yml
---
extensions:
 adobe-mcid:
  orgId: "123345@AdobeOrg"
 adobe-target:
  imsOrgId: "123345@AdobeOrg"
  clientCode: "XXXXXXX"
  serverDomain: "XXXX.tt.omtrdc.net"
 adobe-analytics:
  orgId: "123345@AdobeOrg"
  company: "XXXXXXX"
  staging: "reportSuiteXXXX"
  production: "reportSuiteXXXX"
  development: "reportSuiteXXXX"
dataElements:
 myDataEleement:
  name: "valueXXXXXX"
---
`,
  export:
    `Mode: Export
Requires:
 ` + param_config + `
 ` + param_export + `

Optionally include the PID with a parameter
 ` + param_P + `

Optionally specify the output folder
 ` + param_O + `
`,
  import:
    `Mode: Import
Requires:
 ` + param_config + `
 ` + param_import + `

Optional params:
 ` + param_T + `
 ` + param_P + `
 ` + param_S + `
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
    ${cliName} -c <configFile> --export <pid>
   `,
  delete:
    `Mode: Delete
Requires:
 ` + param_config + `
 ` + param_delete + `

By default, --delete only lists matching properties (preview).
Add --confirm to delete them after reviewing the list.

Examples:
  ${cliName} -c auth.json --delete "2023"
  ${cliName} -c auth.json --delete "2023" --confirm`,
  debug: HELP_DEBUG
};

exports.HELP = HELP;
