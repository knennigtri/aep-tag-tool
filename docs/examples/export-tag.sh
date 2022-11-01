#!/bin/bash

# https://learning.postman.com/docs/running-collections/using-newman-cli/command-line-integration-with-newman/#options

IO_COLLECTION="../../collections/Adobe IO Token.postman_collection.json"
EXPORT_COLLECTION="../../collections/Export Tag Property.postman_collection.json"

# Manually set the postman environment
ENVIRONMENT="example.postman_environment.json"
# Alternatively add the file to the command: $ ./export-tag.sh myEnv.postman_environment.json
ENVIRONMENT=$1

#Adobe IO
newman run "$IO_COLLECTION"  -e $ENVIRONMENT --export-environment "token.$(basename -- $ENVIRONMENT)"

ENVIRONMENT="token.$(basename -- $ENVIRONMENT)"

echo "Enter the ID of the property you would like export:"
read propID

# Get Extensions, Data Elements, and Rules
newman run "$EXPORT_COLLECTION" -e $ENVIRONMENT --env-var "propID=$propID"

rm $ENVIRONMENT