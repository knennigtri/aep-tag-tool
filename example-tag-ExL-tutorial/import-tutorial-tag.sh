#!/bin/bash 

# https://learning.postman.com/docs/running-collections/using-newman-cli/command-line-integration-with-newman/#options

# Name of Tag property
PROPNAME="ExL Target Tutorial"

GLOBALS="settings.postman-globals.json"

# JSON files for all extensions and data elements
EXT_JSON="json-exports/tutorial-extensions.json"
DE_JSON="json-exports/tutorial-data-elements.json"

# Rule Names and corresponding rule component json files
RULENAMES[0]="[10] Target"
RULECMP_JSONS[0]="json-exports/tutorial-rulecmp-target.json"


IO_COLLECTION=https://www.getpostman.com/collections/c962d6b3b81776a4c4bf
IMPORT_COLLECTION=https://www.getpostman.com/collections/c0c463dbe2f98d3b354a

# Manually set the postman environment
ENVIRONMENT=example.postman_environment.json
# Alternatively add the file to the command: $ ./run-venia-tag myEnv.postman_environment.json
ENVIRONMENT=$1

#Adobe IO
newman run $IO_COLLECTION -e $ENVIRONMENT --export-environment "token.$(basename -- $ENVIRONMENT)"

ENVIRONMENT="token.$(basename -- $ENVIRONMENT)"

#Import Tag
newman run $IMPORT_COLLECTION -e $ENVIRONMENT -g $GLOBALS --folder "Create Tag Property" --env-var "propName=$PROPNAME"

echo "Enter the propID from the 'Create Property' response above:" 
read propID

#Extensions
newman run $IMPORT_COLLECTION -e $ENVIRONMENT -g $GLOBALS --folder "Add Tag Extensions" -d $EXT_JSON --env-var "propID=$propID"

#Data Elements
newman run $IMPORT_COLLECTION -e $ENVIRONMENT -g $GLOBALS --folder "Add Tag Data Elements" -d $DE_JSON --env-var "propID=$propID"

for ((i = 0; i < ${#RULECMP_JSONS[@]}; i++))
do
	newman run $IMPORT_COLLECTION -e $ENVIRONMENT -g $GLOBALS --folder "Add Tag Rule and CMPs" -d ${RULECMP_JSONS[$i]} --env-var "propID=$propID" --env-var "ruleName=${RULENAMES[$i]}"
done

#Publish
newman run $IMPORT_COLLECTION -e $ENVIRONMENT -g $GLOBALS --folder "Publish Tag Library" --env-var "propID=$propID"

rm $ENVIRONMENT