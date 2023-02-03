<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Add unique configuration values for Extensions](#add-unique-configuration-values-for-extensions)
  - [Experience Cloud ID Extension](#experience-cloud-id-extension)
  - [Target Extension](#target-extension)
  - [Analytics Extension](#analytics-extension)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

### Add unique configuration values for Extensions

Tag Extensions typically have unique values specific to the Adobe Organization you are using. To mitigate this uniquiness, you can add the custom settings as a JSON in the postman_environment.json file. The easiest way to get these values is to extract them from the export process and edit the unique values. To successfully add them to the postman_environment.json, you need to use a special naming convention: `SETTINGS-<ExtentionName>`. You can find the ExtensionName in nearly any GET request from Launch. In the request below you can see in `data[0].attributes.delegate_descripter_id` the ExtensionName is `adobe-mcid`

``` json
{
  "data": [
    {
      "id": "EX3c928e2340184002be0bbe0ab917f007",
      "type": "extensions",
      "attributes": {
        "created_at": "2022-02-03T18:46:09.825Z",
        "deleted_at": null,
        "dirty": false,
        "enabled": true,
        "name": "adobe-mcid",
        "published": true,
        "published_at": null,
        "revision_number": 0,
        "updated_at": "2022-02-03T18:46:09.825Z",
        "delegate_descriptor_id": "adobe-mcid::extensionConfiguration::config",
        "display_name": "Experience Cloud ID Service",
        "review_status": "unsubmitted",
        "version": "5.3.1",
        "settings": "{\"orgId\":\"myorgID@AdobeOrg\"}"
      },
      ...
      ]
    }
```

#### Experience Cloud ID Extension

Using the example output above, you can update the postman_environments.json file with the adobe-mcid extension settings by creating a new json entry. If you want to learn more about these values, you can look in the [ECID Extension](https://exchange.adobe.com/experiencecloud.details.104231.html) documentation.

myEnv.postman_environment.json

* `orgId` is your organization ID

```json
{
  "key": "SETTINGS_adobe-mcid",
  "value": {
    "orgId": "myorgID@AdobeOrg"
  },
  "enabled": true
},
```

#### Target Extension

The Target extension also has unique values that need configured. If you want to learn more about these values, you can look in the [Target v2 Extension](https://exchange.adobe.com/experiencecloud.details.102722.adobe-target-v2-launch-extension.html) documentation.

* `clientCode` can be found in Adobe Target UI, go to **Administration > Implementation**
* `imsOrgId` is your organization ID
* `serverDomain` is your server donmain

```json
{
  "key": "SETTINGS_adobe-target-v2",
  "value": {
    "targetSettings": {
      "clientCode": "myclientCode",
      "imsOrgId": "myorgID@AdobeOrg",
      "serverDomain": "myclientCode.tt.omtrdc.net",
      "enabled": true,
      "timeout": 3000,
      "version": "2.7.0",
      "endpoint": "/rest/v1/delivery",
      "secureOnly": false,
      "serverState": {},
      "optinEnabled": false,
      "urlSizeLimit": 2048,
      "viewsEnabled": true,
      "optoutEnabled": false,
      "globalMboxName": "target-global-mbox",
      "bodyHiddenStyle": "body {opacity: 0}",
      "pageLoadEnabled": true,
      "analyticsLogging": "server_side",
      "deviceIdLifetime": 63244800000,
      "bodyHidingEnabled": true,
      "decisioningMethod": "server-side",
      "sessionIdLifetime": 1860000,
      "visitorApiTimeout": 2000,
      "authoringScriptUrl": "//cdn.tt.omtrdc.net/cdn/target-vec.js",
      "overrideMboxEdgeServer": false,
      "selectorsPollingTimeout": 5000,
      "defaultContentHiddenStyle": "visibility: hidden;",
      "defaultContentVisibleStyle": "visibility: visible;",
      "overrideMboxEdgeServerTimeout": 1860000,
      "supplementalDataIdParamTimeout": 30
    }
  },
  "enabled": true
},
```



#### Analytics Extension

The Analytics extension also has unique  values that need configured. If you want to learn more about these values, you can look in the [Analytics Extension](https://experienceleague.adobe.com/docs/experience-platform/tags/extensions/adobe/analytics/overview.html?lang=en) documentation.

* `orgId` if your organization ID
* `libraryCode.company` is your Analytics company value
* `libraryCode.accounts.[development | production | staging]` are the different report suites configured
* `trackerProperties.[trackingServer | trackingServerSecure]` are the different tracking servers used for your Analytics

```json
{
  "key": "SETTINGS_adobe-analytics",
  "value": {
    "orgId": "myOrgID@AdobeOrg",
    "libraryCode": {
      "type": "managed",
      "company": "adobev12",
      "accounts": {
        "development": [
          "vlab7dev"
        ],
        "production": [
          "vlab7prod"
        ],
        "staging": [
          "vlab7stage"
        ]
      }
    },
    "trackerProperties": {
      "trackingServer": "acs7-us.sc.omtrdc.net",
      "trackingServerSecure": "acs7-us.sc.omtrdc.net"
    }
  },
  "enabled": true
}
```