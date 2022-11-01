# Venia Tag
This folder represents a sample tag property for the Adobe eCommerce website called [Venia](https://github.com/adobe/aem-cif-guides-venia) for Adobe Experience Manager. This sample tag has data elements and rules for [Target](https://exchange.adobe.com/apps/ec/102722/adobe-target-v2-launch-extension), [Analytics](#), [ECID](https://exchange.adobe.com/apps/ec/100160/adobe-experience-cloud-id-launch-extension), and [Adobe Client Data Layer](https://exchange.adobe.com/apps/ec/104231).

## Prework
1. Create your [postman_environment.json](../../docs/environment.md) for the Adobe organization you will be using
2. Update [venia.postman_globals.json](venia.postman-globals.json) unqiue to your environment. In this file search for `update` and update those values unique to your organization. These are values such as:
   1. OrgID
   2. Target Client Code
   3. Analytics dev, stage, prod suites
   4. Audience Manager tracking servers

## Using aep-tag-tool
```bash
 aep-tag-tool -e example.postman_environment.json -f venia-config.yml --import
 aep-tag-tool -e example.postman_environment.json -f venia-config.yml --export
```
> Learn more about aep-tag-tool in the [README.md](../../README.md)

## Using Newman bash scripts
Make sure to have [Newman](https://www.npmjs.com/package/newman) installed first!
```bash
 npm install -g newman
```

[Import script](import-tag-venia.sh)
```bash
 ./import-tag-venia.sh myEnv.postman_environment.json
```

[Export script](../../docs/examples/export-tag.sh)
```bash
 ./export-tag.sh myEnv.postman_environment.json
```
> Learn more about using newman in
>  * [import-using-newman.md](../../docs/import-using-newman.md)
>  * [export-using-newman.md](../../docs/export-using-newman.md)

## Using Postman
1. Upload your postman_environment.json to Postman
2. Upload all the collections from [collections](../../collections/) to Postman
3. Run the **Adobe IO Token** collection
4. In the **Import Tag Property** collection:
   1. Select the **Create Tag Property** folder
      1. Set a variable: `propName` = Venia
      2. **Run** the folder
   2. Select the **Add Tag Extensions** folder
      1. Click **Run**:
         1. Data: [json-exports/venia-extensions.json](json-exports/venia-extensions.json)
      2. **Run** folder
   3. Select the **Add Tag Data Elements** folder
      1. Click **Run**:
         1. Data: [json-exports/venia-data-elements.json](json-exports/venia-data-elements.json)
      2. **Run** folder
   4. Select the **Add Tag Rule and CMPs** folder
      1. Set a variable: `ruleName` = ECID Authentication
      2. Click **Run**:
         1. Data: [json-exports/venia-rulecmp-ecid.json](json-exports/venia-rulecmp-ecid.json)
      3. **Run** folder
      4. Rerun previous steps for the rest of the rules:
         1. `ruleName` = Analytics Clear and Set Variables
            1. [json-exports/venia-rulecmp-clear-and-set-vars.json](json-exports/venia-rulecmp-clear-and-set-vars.json)
         2. `ruleName` = Analytics Fire Beacon
            1. [json-exports/venia-rulecmp-send-beacon.json](json-exports/venia-rulecmp-send-beacon.json)
         3. `ruleName` = Target
            1. [json-exports/venia-rulecmp-target.json](json-exports/venia-rulecmp-target.json)
   5. Select the **Publish Tag Library** folder
      1. **Run**