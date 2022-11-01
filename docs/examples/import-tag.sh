#!/bin/bash 

# https://learning.postman.com/docs/running-collections/using-newman-cli/command-line-integration-with-newman/#options

# Name of Tag property
PROPNAME="MyProperty"

GLOBALS="example.postman-globals.json"

# JSON files for all extensions and data elements
EXT_JSON="json-exports/MyProperty-extensions.json"
DE_JSON="json-exports/MyProperty-data-elements.json"

# Rule Names and corresponding rule component json files
RULENAMES[0]="Rule 1"
RULECMP_JSONS[0]="json-exports/MyProperty-rule1-rulecmps.json"
RULENAMES[1]="Rule 2"
RULECMP_JSONS[1]="json-exports/MyProperty-rule2-rulecmps.json"
RULENAMES[2]="Rule 3"
RULECMP_JSONS[2]="json-exports/MyProperty-rule3-rulecmps.json"

IO_COLLECTION="../../collections/Adobe IO Token.postman_collection.json"
IMPORT_COLLECTION="../../collections/Import Tag Property.postman_collection.json"

# Manually set the postman environment
ENVIRONMENT="example.postman_environment.json"
# Alternatively add the file to the command: $ ./import-tag.sh myEnv.postman_environment.json
ENVIRONMENT=$1

#Adobe IO
newman run "$IO_COLLECTION" -e $ENVIRONMENT --export-environment "token.$(basename -- $ENVIRONMENT)"

ENVIRONMENT="token.$(basename -- $ENVIRONMENT)"

#Import Tag
newman run "$IMPORT_COLLECTION" -e $ENVIRONMENT --folder "Create Tag Property" --env-var "propName=$PROPNAME"

echo "Enter the propID from the 'Create Property' response above:" 
read propID

#Extensions
newman run "$IMPORT_COLLECTION" -e $ENVIRONMENT -g $GLOBALS --folder "Add Tag Extensions" -d $EXT_JSON --env-var "propID=$propID"

#Data Elements
newman run "$IMPORT_COLLECTION" -e $ENVIRONMENT -g $GLOBALS --folder "Add Tag Data Elements" -d $DE_JSON --env-var "propID=$propID"

for ((i = 0; i < ${#RULECMP_JSONS[@]}; i++))
do
	newman run "$IMPORT_COLLECTION" -e $ENVIRONMENT -g $GLOBALS --folder "Add Tag Rule and CMPs" -d ${RULECMP_JSONS[$i]} --env-var "propID=$propID" --env-var "ruleName=${RULENAMES[$i]}"
done

#Publish
newman run "$IMPORT_COLLECTION" -e $ENVIRONMENT -g $GLOBALS --folder "Publish Tag Library" --env-var "propID=$propID"

rm $ENVIRONMENT