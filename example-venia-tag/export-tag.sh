#!/bin/bash

# https://learning.postman.com/docs/running-collections/using-newman-cli/command-line-integration-with-newman/#options

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