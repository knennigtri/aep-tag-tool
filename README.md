# AEP Tag Tool

[![Build & Publish to NPM and GHP](https://github.com/knennigtri/aep-tag-tool/actions/workflows/release.yml/badge.svg?branch=main)](https://github.com/knennigtri/aep-tag-tool/actions/workflows/release.yml)

Import, Export, and Delete web properties from Adobe Expience Platform Tags, previously known as Launch.

## Overview

This is a project to automates postman collections using the [Reactor API](https://www.adobe.io/experience-platform-apis/references/reactor/). This project makes it easier to quickly import a Tag property into an Adobe Organization for demo purposes or if you are using the same Tag property across organizations. The collections are generic enough to run with without modifications. 

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Installation](#installation)
- [Command Line Tool](#command-line-tool)
- [Create config file for Authentication](#create-config-file-for-authentication)
- [Usage](#usage)
- [Export a Tag](#export-a-tag)
- [Import a Tag](#import-a-tag)
  - [CEDRLP params](#cedrlp-params)
  - [Import into other Organizations](#import-into-other-organizations)
- [Delete tag properties that contain a specific string](#delete-tag-properties-that-contain-a-specific-string)
- [Using this tool without NPM](#using-this-tool-without-npm)
  - [Postman files](#postman-files)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Installation
To install the command line tool globally, run:

```shell
npm install -g @knennigtri/aep-tag-tool
```

## Command Line Tool

Export a tag property:
```bash
 aep-tag-tool -c myconfig.yml --export PR12345678901234567890
```

Import a tag property:
```bash
 aep-tag-tool -c myconfig.yml --import myImportData.json
```

Delete a tag properties that contain 2022 in the title
```bash
 aep-tag-tool -c myconfig.yml --delete "2022"
```

## Create config file for Authentication
1. Create and [Adobe IO project](https://developer.adobe.com/dep/guides/dev-console/create-project/)
   1. Add the Experiance Platform Launch API
      1. Generate a public/private key pair
      2. Download the public/private key
   2. Go to Service Account (JWT)
      1. In the top right click **Download JSON**
      2. Update downloaded file to `config.json`
   3. Update `config.json` to include the path to the private.key you downloaded earlier.
    ```JSON
    {
      "CLIENT_SECRET": "xxxxxxxxxxxxxxxxxxxxx",
      "ORG_ID": "xxxxxxxxxxxxxxxxxxxxx@AdobeOrg",
      "API_KEY": "xxxxxxxxxxxxxxxxxxxxx",
      "TECHNICAL_ACCOUNT_ID": "xxxxxxxxxxxxxxxxxxxxx@techacct.adobe.com",
      "TECHNICAL_ACCOUNT_EMAIL": "xxxxxxxxxxxxxxxxxxxxx@techacct.adobe.com",
      "PUBLIC_KEYS_WITH_EXPIRY": {},
      "PRIVATE_Key": "path/to/private.key"
    }
    ```

Alternatively, you can use yaml as well:
```yaml
---
API_KEY: xxxxxxxxxxxxxxxxxxx
CLIENT_SECRET: xxxxxxxxxxxxxxxxxxx
ORG_ID: xxxxxxxxxxxxxxxxxxx@AdobeOrg
TECHNICAL_ACCOUNT_ID: xxxxxxxxxxxxxxxxxxx@techacct.adobe.com
PRIVATE_KEY: ./private.key
---
```

## Usage
```bash
aep-tag-tool -h
Usage: aep-tag-tool [ARGS]
 Arguments:
    -c, --config <myconfig.yml>         Specify a config file
    -e, --export <PID>                  Mode to export a given property ID.
    -i, --import <propertyFile.json>    Mode to import a property given a config file.
    -d, --delete <searchStr>            Mode to delete properties containing a specific string
    -C,-E,-D,-R,-L,-P                   [import] Options to partially import. See -h import
    -f, --file   <file>                 [import] file containing import json
    -p, --pid    <pid>                  [export, import] property ID
    -s, --search <str>                  [delete] search string for properties deletion
    -o, --output <folder>               [export] folder path to save export property. Default ./
    -g  <postman_globals.json>          Not supported currently
    -v, --version                       Displays version of this package
    -h, --help
               config
               export 
               import
               delete
               debug
```
## Export a Tag
Export mode allows for a web property from AEP Tags to be exported as JSON. Exporting a tag will create a new file with the same name as the web property. The JSON file contents will have:

   * exported property id
   * property title
   * extensions
   * edata elements
   * rules and their rule components

Requires:
```
 -c, --config <myconfig.yml>         Specify a config file
 -e, --export <PID>                  Mode to export a given property ID.
```

Optionally include the PID with a parameter
```
 -p, --pid    <pid>                  [export, import] property ID
```

Optionally specify the output folder
```
 -o, --output <folder>               [export] folder path to save export property. Default ./ 
```

## Import a Tag
Import mode allows for an exported web property from AEP Tags to be imported into an Adobe organization. Import mode will:
 * Create a new web property (`obj.propertyName`) with a host and dev/stage/prod environments
 * Add imported extensions (`obj.extensions`)
 * Create imported data elements (`obj.dataElements`)
 * Create imported rules (`obj.rules.*`)
 * Build the library into dev
 * Publish the library into prod

> You can optionally specify what to create/import/publish with the [CEDRLP parameters](#cedrlp-params). 

Importing into a different Adobe organization should be used with caution since many extension settings are specific to the Adobe organization they are exported from. See [Import into other Organizations](#import-into-other-organizations).

Requires:
```
 -c, --config <myconfig.yml>         Specify a config file
 -i, --import <propertyFile.json>    Mode to import a property given a config file.
```

Optionally include the property file with a parameter
```
 -f, --file   <file>                 [import] file containing import json
 -p, --pid    <pid>                  [export, import] property ID
```
Note: PID is ignored unless importing to an existing property (-C is omited)

propertyFile.json file requires:
 1. propertyFile.propertyName
 2. propertyFile.extensions
 3. propertyFile.dataElements
 4. propertyFile.rules.[rules]

### CEDRLP params
You can specify exactly what you want to create/import with these params. 
No matter the parameter order, they will always execute in the order below.
  `-C`  Creates a new property.

If `-C` is not used with the remaining parameters, a PID is required in parameters
  `-E`  Imports extensions. `propertyFile.extensions` is required.
  `-D`  Imports data elements. `propertyFile.dataElement` is required.
  `-R`  Imports rule components. `propertyFile.rules.[rules]` is required.
  `-L`  Builds a library of all items the Dev environment
  `-P`  Publishes the library into Prod

### Import into other Organizations
1. Create a new [AEP Tag property](https://experienceleague.adobe.com/docs/experience-manager-learn/sites/integrations/experience-platform-launch/create-launch-property.html?lang=en). 
   1. Take note of the PID from the URL: Pxxxxxxxxxxxxxxxxxxxxxxx
   2. Manually adding extensions automatically put default values related to your organization. Look at the propertyFile.json you'd like to import and manually install those extension in you new property
   3. The command below will only import Data Elements (-D) and Rules (-R) from the propertyFile.json
```
 aep-tag-tool -c config.json --import propertyFile.json -p <yourPID> -DR
```
  4. Verify the import and build and deploy a new Library

## Delete tag properties that contain a specific string
Quickly delete web properties that might have been created with this tool. Delete mode allows you to search for web properties in an Adobe organization based on a search string. If any web properties contain the search string, they are deleted. This is particularly useful if you are developing your own property to import/export since all properties end with a timestamp. Searching (-s) for `2022-10-25` would delete `MyProperty 2022-10-25T20:57:42.049Z`, `MyProperty 2022-10-25T21:57:42.049Z`, and `MyProperty 2022-10-25T20:58:42.049Z`.

Requires:
```
 -c, --config <myconfig.yml>         Specify a config file
 -d, --delete <searchStr>            Mode to delete properties containing a specific string
```

Optionally include the search string with a parameter
```
 -s, --search <str>                  [delete] search string for properties deletion
```

## Using this tool without NPM
The Postman collections apart of this tool can also be used with [Postman](https://www.postman.com/) or [npm newman](https://www.npmjs.com/package/newman). See the [extra docs](docs/README.md) to learn more.

### Postman files
* Download the [Authentication Collection](postman/Adobe%20IO%20Token.postman_collection.json)
* Download the [Import Collection](postman/Import%20Tag%20Property.postman_collection.json)
* Download the [Export Collection](postman/Export%20Tag%20Property.postman_collection.json)
* Download the [Delete Collection](postman/Export%20Tag%20Property.postman_collection.json)
* Download a sample [Environment file](postman/aep-tag-tool.postman_environment.json)
  * See configuration instructions: [docs/environment.md](docs/environment.md)