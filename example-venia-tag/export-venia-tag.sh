#!/bin/bash

# https://learning.postman.com/docs/running-collections/using-newman-cli/command-line-integration-with-newman/#options

# Name of Tag property
PROPNAME="Venia"

# JSON files for all extensions and data elements
EXT_JSON="venia-extensions.json"
DE_JSON="venia-data-elements.json"

# Rule Names and corresponding rule component json files
RULENAMES[0]="[10] Target"
RULECMP_JSONS[0]="venia-rulecmp-target.json"
RULENAMES[1]="[50] Analytics Clear and Set Variables"
RULECMP_JSONS[1]="venia-rulecmp-clear-and-set-vars.json"
RULENAMES[2]="[90] Analytics Fire Beacon"
RULECMP_JSONS[2]="venia-rulecmp-send-beacon.json"
RULENAMES[3]="[10] ECID Authentication"
RULECMP_JSONS[3]="venia-rulecmp-ecid.json"

IO_COLLECTION=https://www.getpostman.com/collections/c962d6b3b81776a4c4bf
EXPORT_COLLECTION=https://www.getpostman.com/collections/e8287cbeae23e348a791

# Manually set the postman environment
ENVIRONMENT=example.postman_environment.json
# Alternatively add the file to the command: $ ./run-venia-tag myEnv.postman_environment.json
ENVIRONMENT=$1

#Adobe IO
newman run $IO_COLLECTION -e $ENVIRONMENT --export-environment "token.$(basename -- $ENVIRONMENT)"

ENVIRONMENT="token.$(basename -- $ENVIRONMENT)"

echo "Enter the ID of the property you would like export:"
read propID

# Get Extensions, Data Elements, and Rules
newman run $EXPORT_COLLECTION -e $ENVIRONMENT --folder "Extensions and Data Elements" --env-var "propID=$propID"

newman run $EXPORT_COLLECTION -e $ENVIRONMENT --folder "Rule Components" --env-var "propID=$propID"

rm $ENVIRONMENT


# PROP_ID=PRe1347b49046a4ebab1bbea6c1dd2460e
# ACCESS_TOKEN=eyJhbGciOiJSUzI1NiIsIng1dSI6Imltc19uYTEta2V5LTEuY2VyIn0.eyJpZCI6IjE2NDQ1MTQ1NTY3MzFfNDZmMzg3OTctOGExZC00YTg0LWJhNDctMjUyMzdmNjQ1YTBkX3VlMSIsInR5cGUiOiJhY2Nlc3NfdG9rZW4iLCJjbGllbnRfaWQiOiI1ZjFhMmJkZDZkMjU0MzVjYWU5ODg4NjI1ODJhZWYwMSIsInVzZXJfaWQiOiIzN0MzMjY0MDYxRDg3QkYxMEE0OTVFQkZAdGVjaGFjY3QuYWRvYmUuY29tIiwiYXMiOiJpbXMtbmExIiwiYWFfaWQiOiIzN0MzMjY0MDYxRDg3QkYxMEE0OTVFQkZAdGVjaGFjY3QuYWRvYmUuY29tIiwiY3RwIjowLCJmZyI6IldGM1o3UTRXRkxFNUlQNENFTVFGUlBRQTRFPT09PT09IiwibW9pIjoiNTI0Yzc2MWQiLCJleHBpcmVzX2luIjoiODY0MDAwMDAiLCJzY29wZSI6ImFkZGl0aW9uYWxfaW5mby5qb2JfZnVuY3Rpb24sb3BlbmlkLEFkb2JlSUQscmVhZF9vcmdhbml6YXRpb25zLGFkZGl0aW9uYWxfaW5mby5yb2xlcyxhZGRpdGlvbmFsX2luZm8ucHJvamVjdGVkUHJvZHVjdENvbnRleHQiLCJjcmVhdGVkX2F0IjoiMTY0NDUxNDU1NjczMSJ9.Ln5lFmMWOZBnISuZ7LXmLdm6yXEXOE9xdZMAlDNzV88iQ4Vl9rSq7fCdx--bDSi1id7YYrHhtyvtix455-4RiT21QdSHhCwYTalMpZRkXls2NBW5ApGsP_899eepGnLCEpSfFu13pixECTjc-43izp1vwfvN2-W3gxHDXsWHoYp6Op04qrK1bTCMMMhW8PeH24RtHuC8vT_cqbsKsaifB80clyh-O63tPOll8dsI-ji5ErU-dtaLU9jJECge3M4MKWbwo21tWWuMT0RtdmV5ldVczgTt9D8Wun8AXi7UMcmTkls5jkop1R2_8qMQW9v0DG9xpVMJWpfBg7kWquCZpQ
# CLIENT_ID=5f1a2bdd6d25435cae988862582aef01
# ORG_ID=B4AB28AE56D80CAF7F000101@AdobeOrg
# 
# curl https://reactor.adobe.io/properties/$PROP_ID/extensions \
#   -H "Accept: application/vnd.api+json;revision=1" \
#   -H "Content-Type: application/vnd.api+json" \
#   -H "Authorization: Bearer [$ACCESS_TOKEN]" \
#   -H "X-Api-Key: [$CLIENT_ID]" \
#   -H "X-Gw-Ims-Org-Id: [$ORG_ID]" \
#   -X GET 
#  > data-elements.json
  