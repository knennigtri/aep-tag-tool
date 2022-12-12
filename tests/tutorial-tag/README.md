# AEM and Adobe Target Tutorial
This folder contains example JSON exports that enable Target for Adobe Experience Manager. This use case is from Adobe Experience League tutorial [AEM and Adobe Target](https://experienceleague.adobe.com/docs/experience-manager-learn/sites/integrations/target/overview.html?lang=en). This sample tag has data elements and rules for [Target](https://exchange.adobe.com/apps/ec/102722/adobe-target-v2-launch-extension)

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Prework](#prework)
- [Using aep-tag-tool](#using-aep-tag-tool)
- [Using Newman bash scripts](#using-newman-bash-scripts)
- [Using Postman](#using-postman)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Prework
1. Create your [postman_environment.json](../../docs/environment.md) for the Adobe organization you will be using
2. Update [tutorial.postman_globals.json](tutorial.postman-globals.json) unqiue to your environment. In this file search for `update` and update those values unique to your organization. These are values such as:
   1. OrgID
   2. Target Client Code
   3. Publish server domain

## Using aep-tag-tool
Learn more about aep-tag-tool in the [README.md](../../README.md)

```bash
 aep-tag-tool -e example.postman_environment.json -f tutorial-config.yml --import
 aep-tag-tool -e example.postman_environment.json -f turorial-config.yml --export
```


## Using Newman bash scripts
Learn more about using newman in
 * [import-using-newman.md](../../docs/import-using-newman.md)
 * [export-using-newman.md](../../docs/export-using-newman.md)

Make sure to have [Newman](https://www.npmjs.com/package/newman) installed first!
```bash
 npm install -g newman
```

[Import script](import-tag-venia.sh)
```bash
 ./import-tag-tutorial.sh myEnv.postman_environment.json
```

[Export script](../../docs/examples/export-tag.sh)
```bash
 ./export-tag.sh myEnv.postman_environment.json
```

## Using Postman
Learn more about using Postman in
 * [import-using-postman.md](../../docs/import-using-postman.md)
 * [export-using-postman.md](../../docs/export-using-postman.md)

Steps to Import using Postman
1. Upload your postman_environment.json to Postman
2. Upload all the collections from [collections](../../collections/) to Postman
3. Run the **Adobe IO Token** collection
4. In the **Import Tag Property** collection:
   1. Select the **Create Tag Property** folder
      1. Set a variable: `propName` = ExL Tutorial
      2. **Run** the folder
   2. Select the **Add Tag Extensions** folder
      1. Click **Run**:
         1. Data: [json-exports/tutorial-extensions.json](json-exports/tutorial-extensions.json)
      2. **Run** folder
   3. Select the **Add Tag Data Elements** folder
      1. Click **Run**:
         1. Data: [json-exports/turorial-data-elements.json](json-exports/turorial-data-elements.json)
      2. **Run** folder
   4. Select the **Add Tag Rule and CMPs** folder
      1. Set a variable: `ruleName` = Target
      2. Click **Run**:
         1. Data: [json-exports/tutorial-rulecmp-target.json](json-exports/tutorial-rulecmp-target.json)
      3. **Run** folder
   5. Select the **Publish Tag Library** folder
      1. **Run**