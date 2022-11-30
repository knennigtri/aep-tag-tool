# AEP Tag Tool
Import, Export, and Delete web properties from Adobe Expience Platform Tags, previously known as Launch.

## Overview

This is a project to automates postman collections using the [Reactor API](https://www.adobe.io/experience-platform-apis/references/reactor/). This project makes it easier to quickly import a Tag property into an Adobe Organization for demo purposes or if you are using the same Tag property across organizations. The collections are generic enough to run with without modifications. 

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [AEP Tag Tool](#aep-tag-tool)
  - [Overview](#overview)
  - [Installation](#installation)
  - [Command Line Tool](#command-line-tool)
  - [Usage](#usage)
  - [Export a Tag](#export-a-tag)
    - [Using only the Export Collection:](#using-only-the-export-collection)
  - [Import a Tag](#import-a-tag)
    - [Using only the Import Collection:](#using-only-the-import-collection)
  - [Delete tag properties that contain a specific string](#delete-tag-properties-that-contain-a-specific-string)
  - [Customize Settings for the Import](#customize-settings-for-the-import)
    - [Extensions](#extensions)
    - [Data Elements](#data-elements)
    - [Rules](#rules)
  - [Postman Collections](#postman-collections)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Installation
To install the command line tool globally, run:

```shell
npm install -g @knennigtri/aep-tag-tool
```

## Command Line Tool

Export a tag property:
```bash
 aep-tag-tool --export -e myEnvironment.postman_environment.json -p PR12345678901234567890
```

Import a tag property:
```bash
 aep-tag-tool --import -e myEnvironment.postman_environment.json -f myConfig.json
```

Delete a tag properties that contain 2022 in the title
```bash
 aep-tag-tool --delete -e myEnvironment.postman_environment.json -s "2022"
```

## Usage
//TODO Add -CEDRP
```bash
aep-tag-tool -h
Usage: aep-tag-tool [ARGS]
 Arguments:
    --export                        Mode to export a given property ID
    --import                        Mode to import a property given a config file
    --delete                        Mode to delete properties containing a specific string
    -f  <file>                      configuration [json | yml] file
    -e  <postman_environment.json>  specify an environment file
    -g  <postman_globals.json>      specify a global file
    -p, --pid  <pid>                property ID. Req for export mode
    -s, --search  <str>             search string for properties to delete. Reg for delete mode
    -h, --help
               configfile           config file format
               export               how to use export mode
               import               how to use import mode
               delete               how to use delete mode
    -v, --version                   Displays version of this package
```
## Export a Tag
Export mode allows for a web property from AEP Tags to be exported as JSON. Exporting a tag will:
 * create a configuration file with the same name as the property
 * export extensions
 * export data elements
 * export rules and their rule components

Export mode requires:
 -e  <postman_environment.json>  specify an environment file
 -p, --pid  <pid>                property ID. Req for export mode

```bash
  aep-tag-tool --export -e myEnvironment.postman_environment.json -p PR12345678901234567890
```

These values can alternatively be set in a config file:
   configFile.environment
   configfile.propID

```bash
  aep-tag-tool --export -f myConfig.json
```
myConfig.json
```json
{
  "environment": "path/to/myEnvironment.postman_environment.json",
  "propID": "PR12345678901234567890"
}
```

### Using only the [Export Collection](collections/Export%20Tag%20Property.postman_collection.json):
* Using Postman collection runner on folders - [Learn how to use the Export Tag collection](exportTagCollection.md)
* Using Newman to run the collection folders - See [example export bash script](example-venia-tag/export-tag.sh)

> Running through the requests of this collection will create responses that need to be saved to use for Importing into other organizations. You will end up with `1` **extensions.json**, `1` **data-elements.json**, and `n` **rulecmp-json** files where `n` is the number of rules in your property

## Import a Tag
//TODO Add -CEDRP
Import mode allows for an exported web property from AEP Tags to be imported into an Adobe organization. Import mode will:
 * Create a new web property (`configFile.propName`)
   * Create a Host adn dev/stage/prod environments
 * Add imported extensions (`configFile.extensions`)
 * Create imported data elements (`configFile.dataElements`)
 * Create imported rules (`configFile.rules.*`)
 * Create a Library and publish it

Importing into a different Adobe organization should be used with caution since many extension settings are specific to the Adobe organization they are exported from. These can be updated with a postman_globals.json file if needed. See [Customize Settings for the the import](#customize-settings-for-the-import).

Import mode requires:
 -e  <postman_environment.json>  specify an environment file
 -f  <file>                      configuration [json | yml] file

  The config file requires:
    configFile.import.extensions
    configFile.import.dataElements
    configFile.import.rules.[rules]

### Using only the [Import Collection](collections/Import%20Tag%20Property.postman_collection.json):
* Using Postman collection runner on folders - [Learn how to use the Import Tag collection](importTagCollection.md)
* Using Newman to run the collection folders - See [example import bash script](example-venia-tag/import-venia-tag.sh) 

## Delete tag properties that contain a specific string
Quickly delete web properties that might have been created with this tool. Delete mode allows you to search for web properties in an Adobe organization based on a search string. If any web properties contain the search string, they are deleted. This is particularly useful if you are developing your own property to import/export since all properties end with a timestamp. Searching (-s) for `2022-10-25` would delete `MyProperty 2022-10-25T20:57:42.049Z`, `MyProperty 2022-10-25T21:57:42.049Z`, and `MyProperty 2022-10-25T20:58:42.049Z`.

Delete mode requires:
 -e  <postman_environment.json>  specify an environment file
 -s, --search  <str>             search string for properties to delete. Reg for delete mode
  
  These values can alternatively be set in the config file:
    configFile.environment
    configfile.delete.searchStr

```bash
  aep-tag-tool --delete -e myEnvironment.postman_environment.json -s 2022
```

These values can alternatively be set in the config file:
   configFile.environment
   configfile.delete.searchStr

```bash
  aep-tag-tool --export -f myConfig.json
```
myConfig.json
```json
{
  "environment": "path/to/myEnvironment.postman_environment.json",
  "delete": {
    "searchStr": "PR12345678901234567890"
  }
}
```

## Customize Settings for the Import
//TODO document custom settings

### Extensions

### Data Elements

### Rules
In this release there is no ability to customize rule settings. If this is a needed feature, fill out a git issue.

## Postman Collections
The Postman collections apart of this tool can also be used with [Postman](https://www.postman.com/) or [npm newman](https://www.npmjs.com/package/newman). See the [collection docs](docs/README.md) to learn more.
* [Example Environment](docs/example.postman_environment.json)
  * See configuration instructions: [docs/environment.md](docs/environment.md)