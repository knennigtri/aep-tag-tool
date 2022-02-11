# launch-api-automation

This is a project to automate import/export of Adobe Experience Platform Tags, previously known as Launch, using the [Reactor API](https://www.adobe.io/experience-platform-apis/references/reactor/). This project is to make it easier to quickly import a Tag property into a new IMS Org for demo purposes or if you are using the same Tag property across organizations. The collections are generic enough to run with without modifications. 

The following Postman collections were written for this project:

* Adobe IO token - https://www.postman.com/science-participant-93156893/workspace/nennig-public/collection/17913394-ed73079d-9678-443b-a911-a14342071afa
* Import Tag - https://www.postman.com/science-participant-93156893/workspace/nennig-public/collection/17913394-6db48b3d-d97b-40b5-98a6-56ca83086ad9
* Export Tag - https://www.postman.com/science-participant-93156893/workspace/nennig-public/collection/17913394-3f0d5e1f-e31a-46e9-967e-ab01ddc65149

To use these collections you will need use your own environment:

* View an [example.postman_environment.json](example.postman_environment.json). 
* See configuration instructions: [environment.md](environment.md) 

### Automation

Automation can be easily achieved using the [npm module Newman](https://www.npmjs.com/package/newman). Learn how to use newman in your own project: https://learning.postman.com/docs/running-collections/using-newman-cli/command-line-integration-with-newman/#options

import and export example scripts using Newman can be found in the [example-venia-tag](example-vena-tag) folder

### Import Tag collection

The Import tag collection can be used one of two ways:

* Using Postman collection runner on folders - [Learn how to use the Import Tag collection](importTagCollection.md)
* Using Newman to run the collection folders - See [example import bash script](example-venia-tag/import-venia-tag.sh)

Once you have the json responses from the original tag property, importing these values into a new organization can be done in less than 5 minutes. 

### Export Tag collection

The Export tag collection can be used one of two ways:

* Using Postman collection runner on folders - [Learn how to use the Export Tag collection](exportTagCollection.md)
* Using Newman to run the collection folders - See [example export bash script](example-venia-tag/export-tag.sh)

Running through the requests of this collection will create responses that need to be saved to use for Importing into other organizations. You will end up with `1` **extensions.json**, `1` **data-elements.json**, and `n` **rulecmp-json** files where `n` is the number of rules in your property

