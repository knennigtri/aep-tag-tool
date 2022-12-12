# Import using NPM module newman

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Prerequisites](#prerequisites)
- [Importing to a different Adobe Organization](#importing-to-a-different-adobe-organization)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

### Prerequisites

* [postman_environment.json](environment.md) file is configured and imported into postman
* Make sure to have [Newman](https://www.npmjs.com/package/newman) installed
```bash
 npm install -g newman
```
* You have tag export files to import such as:
  * myProject-extensions.json
  * myProject-data-elements.json
  * myProject-rulecmps-myRuleName1.json
  * myProject-rulecmps-myRuleName2.json

### Importing to a different Adobe Organization
If you are trying to import a tag property into a different organization than what it was exported from, there will be unique values that need to be updated. This can be done 2 different ways:
 1. Create a [postman_globals.json](globals.md) and add the unique settings as key value pairs
 2. Manually update the unique values after import

1. Make edits to the import-tag.sh
   1. Optionally set `ENVIRONMENT` with your postman_environment.json
   2. Optionally set `GLOBALS` with your postman_globals.json
   3. Verify `IO_COLLECTION` path is correct
   4. Verify `IMPORT_COLLECTION` path is correct
   5. Set `PROPNAME`
   6. Set `EXT_JSON` path
   7. Set `DE_JSON` path
   8. Set all `RULENAMES` paths
   9. Set all `RULENAMES_JSON` paths
2. Run
```bash
 ./import-tag.sh ./environments/myEnv.postman_environment.json 
```
> You don't need to specify your environment if it's set in the script
3. You will be prompted to enter the propID from the response above. Scroll up in the console and look for `Create Property`
   1. In the reponse test, you should see `Property:  2022-11-01T20:01:47.017Z created with ID: PR69bad8d31cf7488daebace0c8dfb9679`
   2. Copy and paste the ID back into the console and click **Enter**
4. The Tag property will now successfully import into the specified property ID.