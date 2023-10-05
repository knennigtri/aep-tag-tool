# Understand settings.yml
settings.yml Format:
```yaml
tag-component:
  component-itemX:
    settings-keyA: value
    settings-keyB: value
    settings-keyC: value
  component-item2:
    settings-keyY: value
tag-component:
  component-item:
    settings-key: value
```

 * `tag-component`: Should be **extensions** or **dataElements** depending on the type of component-item being updating.
 * `component-item`: Must be the **attributes.name** value of the desired component-item
 * `settings-key`: value
Must be a key/value pair in the **attributes.settings** of the desired component-item

## Example
**my-exported-tag.json**
```
{
  "propID": "PRc768711234hh12341561l",
  "propertyName": "Example tag",
  "extensions": [
    {
      "id": "EXa2d289107603442e880c897e696e9ab9",
      "type": "extensions",
      "attributes": {
        "created_at": "2022-10-25T20:22:53.985Z",
        "deleted_at": null,
        "dirty": false,
        "enabled": true,
        "name": "adobe-mcid",
        "published": true,
        "published_at": null,
        "revision_number": 0,
        "updated_at": "2022-10-25T20:22:53.985Z",
        "created_by_email": "a11eba16-8ed1-4f5d-8d3a-f2e2a7fab1a3@techacct.adobe.com",
        "created_by_display_name": "a11eba16-8ed1-4f5d-8d3a-f2e2a7fab1a3@techacct.adobe.com",
        "updated_by_email": "a11eba16-8ed1-4f5d-8d3a-f2e2a7fab1a3@techacct.adobe.com",
        "updated_by_display_name": "a11eba16-8ed1-4f5d-8d3a-f2e2a7fab1a3@techacct.adobe.com",
        "delegate_descriptor_id": "adobe-mcid::extensionConfiguration::config",
        "display_name": "Experience Cloud ID Service",
        "review_status": "unsubmitted",
        "version": "5.5.0",
        "settings": "{\"orgId\":\"test@AdobeOrg\"}"
      },
      ...
    }
  ],
  "dataElements": [{...}],
  "rules": [{...}]
}
```

**import-settings.yml**
```yaml
extentions:
  adobe-mcid:
    orgId: 12345123451234512345@AdobeOrg
```

