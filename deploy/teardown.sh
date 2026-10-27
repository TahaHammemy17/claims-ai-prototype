#!/usr/bin/env bash
# Supprime tout ce que deploy.sh a créé : déclencheur, fonction, journaux, bucket et son contenu, rôle.
# À lancer dans AWS CloudShell. Demande une confirmation.
set -uo pipefail
export AWS_PAGER=""

REGION="${REGION:-eu-north-1}"
FONCTION="claims-ai-extraction"
ROLE="claims-ai-lambda-role"
ACCOUNT="$(aws sts get-caller-identity --query Account --output text)"
BUCKET="claims-ai-demo-${ACCOUNT}"

echo "Ceci supprime définitivement : la fonction $FONCTION, le bucket $BUCKET (et ses fichiers), le rôle $ROLE."
read -r -p "Taper SUPPRIMER pour confirmer : " reponse
[ "$reponse" = "SUPPRIMER" ] || { echo "Annulé."; exit 1; }

echo "1/5 Déclencheur"
aws s3api put-bucket-notification-configuration --bucket "$BUCKET" --notification-configuration '{}' 2>/dev/null || echo "    déjà absent"
echo "2/5 Fonction"
aws lambda delete-function --function-name "$FONCTION" --region "$REGION" 2>/dev/null || echo "    déjà absente"
echo "3/5 Journaux"
aws logs delete-log-group --log-group-name "/aws/lambda/$FONCTION" --region "$REGION" 2>/dev/null || echo "    déjà absents"
echo "4/5 Bucket et contenu"
aws s3 rm "s3://$BUCKET" --recursive 2>/dev/null || true
aws s3api delete-bucket --bucket "$BUCKET" --region "$REGION" 2>/dev/null || echo "    déjà absent"
echo "5/5 Rôle"
aws iam delete-role-policy --role-name "$ROLE" --policy-name claims-ai-permissions 2>/dev/null || true
aws iam detach-role-policy --role-name "$ROLE" --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole 2>/dev/null || true
aws iam delete-role --role-name "$ROLE" 2>/dev/null || echo "    déjà absent"

echo "Terminé. Vérifier : aws lambda list-functions --region $REGION --query 'Functions[].FunctionName'"
