# launch-api-automation

This is a project to automate import/export of Adobe Experience Platform Tags, previously known as Launch, using the [Reactor API](https://www.adobe.io/experience-platform-apis/references/reactor/). This project is to make it easier to quickly import a Tag property into a new IMS Org for demo purposes or if you are using the same Tag property across organizations. The collections are generic enough to run with without modifications. There are a couple of unique variables such as the Tag property name and rule name for adding rule components that need set during import.

This was written with a Postman collection runner. In order to use these collections you will need to import:

* a completed [example.postman_environment.json](example.postman_environment.json). To configure see [environment.md](environment.md) 
* Adobe IO token.postman_collection.json
* Import Tag.postman_collection
* Export Tag.Postman_collection

### Import Tag collection

The [Import Tag collection](Import Tag.postman_collection.json) can be used to quickly create a Launch Tag property in an organization. Once you have the json responses from the original tag property, importing these values into a new organization can be done in less than 5 minutes. [Learn how to use the Import Tag collection](importTagCollection.md)

### Export Tag collection

The [Export Tag collection](Export Tag.postman_collection.json) can be used to extract the original Tag property from an existing organization. Running through the requests of this collection will create responses that need to be saved to use for Importing into other organizations. [Learn how to use the Export Tag collection](exportTagCollection.md)

