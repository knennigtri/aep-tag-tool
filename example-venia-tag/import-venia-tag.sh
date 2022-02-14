#!/bin/bash 

# https://learning.postman.com/docs/running-collections/using-newman-cli/command-line-integration-with-newman/#options

# Name of Tag property
PROPNAME="Venia"

GLOBALS="venia.postman-globals.json"

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
IMPORT_COLLECTION=https://www.getpostman.com/collections/c0c463dbe2f98d3b354a
#IMPORT_COLLECTION=https://www.getpostman.com/collections/2f3dc4c81eb464c21693


# Manually set the postman environment
ENVIRONMENT=example.postman_environment.json
# Alternatively add the file to the command: $ ./run-venia-tag myEnv.postman_environment.json
ENVIRONMENT=$1

#Adobe IO
newman run $IO_COLLECTION -e $ENVIRONMENT --export-environment "token.$(basename -- $ENVIRONMENT)"

ENVIRONMENT="token.$(basename -- $ENVIRONMENT)"

#Import Tag
newman run $IMPORT_COLLECTION -e $ENVIRONMENT --folder "Create Tag Property" --env-var "propName=$PROPNAME"

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