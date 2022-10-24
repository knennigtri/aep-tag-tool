# launch-api-automation

## Overview

This is a project to automate import/export of Adobe Experience Platform Tags, previously known as Launch, using the [Reactor API](https://www.adobe.io/experience-platform-apis/references/reactor/). This project is to make it easier to quickly import a Tag property into a new IMS Org for demo purposes or if you are using the same Tag property across organizations. The collections are generic enough to run with without modifications. 

<!-- START doctoc -->
<!-- END doctoc -->

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
## Export Tag collection

The Export tag collection can be used one of two ways:


Other options for using the Export Collection:
* Using Postman collection runner on folders - [Learn how to use the Export Tag collection](exportTagCollection.md)
* Using Newman to run the collection folders - See [example export bash script](example-venia-tag/export-tag.sh)

Running through the requests of this collection will create responses that need to be saved to use for Importing into other organizations. You will end up with `1` **extensions.json**, `1` **data-elements.json**, and `n` **rulecmp-json** files where `n` is the number of rules in your property

## Import Tag collection

The Import tag collection can be used one of two ways:

* Using Postman collection runner on folders - [Learn how to use the Import Tag collection](importTagCollection.md)
* Using Newman to run the collection folders - See [example import bash script](example-venia-tag/import-venia-tag.sh)

Once you have the json responses from the original tag property, importing these values into a new organization can be done in less than 5 minutes. 

## Delete tag properties that contain a specific string

//TODO

## Postman Collections and Objects

* [Adobe IO token Collection](collections/Adobe%20IO%20Token.postman_collection.json)
* [Export Tag Collection](collections/Export%20Tag%20Property.postman_collection.json)
* [Import Tag Collection](collections/Import%20Tag%20Property.postman_collection.json)
* [Delete Tags Collection](collections/Delete%20Properties.postman_collection.json)
* [Example Environment](example.postman_environment.json)
  * See configuration instructions: [docs/environment.md](docs/environment.md) 
* [Example Globals](example.postman-globals.json)
  * Used to customize a tag import into a different organization. Updating the configurations on an extension that's specific to the new orangization.
  * See configuration instructions: [docs/globals.md](docs/globals.md) 