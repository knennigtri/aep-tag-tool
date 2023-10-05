# Generate an Auth file

## OAuth
1. Create and [Adobe IO project](https://developer.adobe.com/dep/guides/dev-console/create-project/)
   1. Add the Experiance Platform Launch API
      1. Choose OAuth
      2. Select the appropriate Launch profile
   2. Go to the Credentials screen and download the JSON.

## JWT
1. Create and [Adobe IO project](https://developer.adobe.com/dep/guides/dev-console/create-project/)
   1. Add the Experiance Platform Launch API
      1. Choose JWT
      2. Generate a public/private key pair
      3. Download the public/private key
   2. Go to the Credentials screen and download the JSON. Adobe has deprecated JWT and OAuth is preferred.
   3. Update the downloaded JSON to include a path the the private key

```json
{
    ...
    "PRIVATE_Key": "path/to/private.key"
}
```