#!/usr/bin/env bash
# Déploie la démonstration AWS : bucket S3 privé, rôle aux droits minimaux, fonction Lambda, déclencheur.
# À lancer dans AWS CloudShell, depuis le dossier qui contient lambda.zip (voir scripts/build-lambda.sh).
#
#   bash deploy.sh                       # déploie avec l'extracteur à règles (sans Bedrock)
#   EXTRACTEUR=bedrock bash deploy.sh    # déploie avec le modèle d'IA (Nova Lite par défaut)
#
# Le script peut être relancé : il met à jour ce qui existe déjà.
set -euo pipefail
export AWS_PAGER=""

REGION="${REGION:-eu-north-1}"
FONCTION="claims-ai-extraction"
ROLE="claims-ai-lambda-role"
EXTRACTEUR="${EXTRACTEUR:-regles}"
MODELE="${BEDROCK_MODEL_ID:-amazon.nova-lite-v1:0}"
ACCOUNT="$(aws sts get-caller-identity --query Account --output text)"
BUCKET="claims-ai-demo-${ACCOUNT}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

[ -f lambda.zip ] || { echo "lambda.zip introuvable dans le dossier courant."; exit 1; }

echo "1/6 Bucket S3 : privé, chiffré, expiration des fichiers après 1 jour"
if aws s3api head-bucket --bucket "$BUCKET" 2>/dev/null; then
  echo "    existe déjà"
else
  aws s3api create-bucket --bucket "$BUCKET" --region "$REGION" --create-bucket-configuration "LocationConstraint=$REGION" >/dev/null
fi
aws s3api put-public-access-block --bucket "$BUCKET" \
  --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
aws s3api put-bucket-encryption --bucket "$BUCKET" \
  --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
aws s3api put-bucket-lifecycle-configuration --bucket "$BUCKET" \
  --lifecycle-configuration '{"Rules":[{"ID":"expiration-1-jour","Status":"Enabled","Filter":{"Prefix":""},"Expiration":{"Days":1},"AbortIncompleteMultipartUpload":{"DaysAfterInitiation":1}}]}'

echo "2/6 Rôle de la fonction : moindre privilège"
cat > "$TMP/trust.json" << 'JSON'
{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]}
JSON
if aws iam get-role --role-name "$ROLE" >/dev/null 2>&1; then
  echo "    existe déjà"
else
  aws iam create-role --role-name "$ROLE" --assume-role-policy-document "file://$TMP/trust.json" >/dev/null
  echo "    attente de la propagation du rôle"; sleep 10
fi
aws iam attach-role-policy --role-name "$ROLE" --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
cat > "$TMP/permissions.json" << JSON
{"Version":"2012-10-17","Statement":[
 {"Sid":"LireEntrees","Effect":"Allow","Action":"s3:GetObject","Resource":"arn:aws:s3:::${BUCKET}/entrees/*"},
 {"Sid":"EcrireSorties","Effect":"Allow","Action":"s3:PutObject","Resource":"arn:aws:s3:::${BUCKET}/sorties/*"},
 {"Sid":"AppelerNovaLite","Effect":"Allow","Action":"bedrock:InvokeModel","Resource":"arn:aws:bedrock:${REGION}::foundation-model/amazon.nova-lite-v1:0"}
]}
JSON
aws iam put-role-policy --role-name "$ROLE" --policy-name claims-ai-permissions --policy-document "file://$TMP/permissions.json"
ROLE_ARN="$(aws iam get-role --role-name "$ROLE" --query Role.Arn --output text)"

echo "3/6 Fonction Lambda (Node.js 22, 512 Mo, 60 s) avec EXTRACTEUR=$EXTRACTEUR"
ENVIRONNEMENT="Variables={EXTRACTEUR=${EXTRACTEUR},BEDROCK_MODEL_ID=${MODELE}}"
if aws lambda get-function --function-name "$FONCTION" --region "$REGION" >/dev/null 2>&1; then
  aws lambda update-function-code --function-name "$FONCTION" --zip-file fileb://lambda.zip --region "$REGION" >/dev/null
  aws lambda wait function-updated --function-name "$FONCTION" --region "$REGION"
  aws lambda update-function-configuration --function-name "$FONCTION" --environment "$ENVIRONNEMENT" --region "$REGION" >/dev/null
else
  aws lambda create-function --function-name "$FONCTION" --runtime nodejs22.x --architectures x86_64 \
    --handler lambda/handler.handler --role "$ROLE_ARN" --zip-file fileb://lambda.zip \
    --timeout 60 --memory-size 512 --environment "$ENVIRONNEMENT" --region "$REGION" >/dev/null
fi
aws lambda wait function-active-v2 --function-name "$FONCTION" --region "$REGION"
aws lambda wait function-updated --function-name "$FONCTION" --region "$REGION"

echo "4/6 Pas de relance automatique en cas d'erreur (évite de répéter un appel payant)"
aws lambda put-function-event-invoke-config --function-name "$FONCTION" --maximum-retry-attempts 0 --region "$REGION" >/dev/null

echo "5/6 Autorisation donnée à S3 (limitée à ce bucket et à ce compte)"
aws lambda remove-permission --function-name "$FONCTION" --statement-id s3-invoque --region "$REGION" 2>/dev/null || true
aws lambda add-permission --function-name "$FONCTION" --statement-id s3-invoque --action lambda:InvokeFunction \
  --principal s3.amazonaws.com --source-arn "arn:aws:s3:::${BUCKET}" --source-account "$ACCOUNT" --region "$REGION" >/dev/null

echo "6/6 Déclencheur : uniquement le dossier entrees/"
FUNCTION_ARN="$(aws lambda get-function --function-name "$FONCTION" --region "$REGION" --query Configuration.FunctionArn --output text)"
cat > "$TMP/notification.json" << JSON
{"LambdaFunctionConfigurations":[{"Id":"traiter-les-entrees","LambdaFunctionArn":"${FUNCTION_ARN}","Events":["s3:ObjectCreated:*"],"Filter":{"Key":{"FilterRules":[{"Name":"prefix","Value":"entrees/"}]}}}]}
JSON
aws s3api put-bucket-notification-configuration --bucket "$BUCKET" --notification-configuration "file://$TMP/notification.json"

echo
echo "Déploiement terminé. Pour tester :"
echo "  aws s3 cp <document.pdf> s3://${BUCKET}/entrees/"
echo "  aws s3 ls s3://${BUCKET}/sorties/"
