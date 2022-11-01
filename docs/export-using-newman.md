# Export using NPM module newman

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

    - [Prerequisites](#prerequisites)
- [Export Process](#export-process)
  - [Successful output](#successful-output)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

### Prerequisites

* [postman_environment.json](environment.md) file is configured and imported into postman
* Make sure to have [Newman](https://www.npmjs.com/package/newman) installed
```bash
 npm install -g newman
```

# Export Process

1. Make edits to the export-tag.sh
   1. Optionally set `ENVIRONMENT` with your postman_environment.json
   2. Verify `IO_COLLECTION` path is correct
   3. Verify `EXPORT_COLLECTION` path is correct
2. Run
```bash
 ./export-tag.sh ./environments/myEnv.postman_environment.json 
```
> You don't need to specify your environment if it's set in the script
3. Specify the property ID you are exporting. You can get this value from the URL:
   1. Example URL: https://experience.adobe.com/#/@myORG/sname:prod/data-collection/tags/companies/CO285b282155aa4b089edc597a9bfc3251/properties/PR0d42d6a73e07437da2fc4760a02a7850/overview
   2. property ID: PR0d42d6a73e07437da2fc4760a02a7850
4. newman will output all the `data` values needed to the console.
5. In the console, look for `List Extensions` and in the response:
   1. Copy the `data` value (everything in [ ])
   2. Add the JSON to **myProject-extensions.json**
6. In the console, look for `List Data Elements` and in the response:
   1. Copy the `data` value (everything in [ ])
   2. Add the JSON to **myProject-data-elements.json**
7. In the console, look for `List Rule Components` and in the response:
   1. Create a file based on the Rule name in the response **myProject-rulecmps-myRuleName1.json**
   2. Copy the `data` value (everything in [ ])
   3. Add the JSON to **myProject-rulecmps-myRule1.json**
8. Repeat previous setup for all `List Rule Component` responses


## Successful output
Once you have successfully created all your JSON files you should end up with:

 - My export folder
   + myProject-extensions.json
   + myProject-data-elements.json
   + myProject-rulecmp-myRuleName1.json
   + myProject-rulecmp-myRuleName2.json