# Export a tag using Postman

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

  - [Prerequisites](#prerequisites)
- [Export Process](#export-process)
- [Successful output](#successful-output)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

### Prerequisites

* [postman_environment.json](environment.md) file is configured to your Adobe Organization
* [Import](https://testfully.io/blog/import-from-postman/#import-postman-environments) your postman_environment.json
* Import [Adobe IO Token](../collections/Adobe%20IO%20Token.postman_collection.json) collection to Postman
* Import [Export Tag Property](../collections/Export%20Tag%20Property.postman_collection.json) collection to Postman

## Export Process

1. In Postman, select your environment that you imported
2. Run the collection `Adobe IO Token` to authenticate to your organization
3. Select the `Export Tag` collection
   1. Set a variable: `propID` = PR0000000000000 (property ID you would like to export)
   2. Click **Run** to show the Runner
      1. [X] Save Responses
      2. **Run Export Tag Property**

<img src="links/exportTagCollection/Screen Shot 2022-02-11 at 5.20.38 PM.png" alt="Screen Shot 2022-02-11 at 5.20.38 PM" style="zoom:50%;" />

4. The Runner should successfully run all requests. In the **All Tests** tab:
   1. Click on `List Extensions > Response Body` and copy the `data` value (everything in [ ])
      1. Add the JSON to a new file called **myProject-extensions.json**
   2. Click on `List Data Elements > Response Body` and copy the `data` value (everything in [ ])
      1. Add the JSON to a new file called **myProject-data-elements.json**
   3. Find the first `List Rules Components` test
      1. Create a file with the rule name found in the Pass message: **myProject-rulecmp-myRuleName1.json**
      2. Click on `List Rules Components > Response Body` and copy the `data` value (everything in [ ])
      3. Add the JSON to **myProject-rulecmp-myRuleName.json**

<img src="links/exportTagCollection/Screen Shot 2022-02-11 at 5.19.16 PM.png" alt="Screen Shot 2022-02-11 at 5.19.16 PM" style="zoom:50%;" />

   4. Repeat previous step for all `List Rules Components` responses

## Successful output
Once you have successfully created all your JSON files you should end up with:

 - My export folder
   + myProject-extensions.json
   + myProject-data-elements.json
   + myProject-rulecmp-myRuleName1.json
   + myProject-rulecmp-myRuleName2.json

> **IMPORTANT!!** When you export extensions, data elements, and rules  with javascript in them, there is a chance you might need to escape certain characters again to make valid JSON files. Make sure you validate your JSON files after you copy the responses!
>
> Example:
>
> ```json
> //This is not valid JSON exported from Postman
> "settings":"{\"source\":\"if(event \&\& event.id) {\\n    return event.id;\\n}\"}"
> ```
>
> Needs to be updated to valid JSON:
>
> ```json
> "settings":"{\"source\":\"if(event \\&\\& event.id) {\\n    return event.id;\\n}\"}"
> ```