#!/usr/bin/env bash
# Construit le paquet de la fonction Lambda (lambda.zip).
# À exécuter sous Linux x86_64 (ou dans AWS CloudShell) : la bibliothèque PDF embarque un composant natif
# qui doit correspondre au système de Lambda. Un paquet construit sous Windows ne fonctionnerait pas.
set -euo pipefail

RACINE="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "1/4 Compilation"
(cd "$RACINE" && rm -rf dist-lambda && npx tsc -p tsconfig.lambda.json)

echo "2/4 Dépendances de production"
cp "$RACINE/package.json" "$RACINE/package-lock.json" "$TMP/"
(cd "$TMP" && npm ci --omit=dev --ignore-scripts --no-audit --no-fund)
# Le kit AWS est fourni par l'environnement Lambda : inutile de l'embarquer.
rm -rf "$TMP/node_modules/@aws-sdk" "$TMP/node_modules/@smithy" "$TMP/node_modules/@aws-crypto"
# Composant natif : on ne garde que la variante glibc (celle de Lambda).
rm -rf "$TMP"/node_modules/@napi-rs/canvas-linux-x64-musl

echo "3/4 Assemblage"
cp -r "$RACINE/dist-lambda/." "$TMP/"
rm -f "$TMP/package.json" "$TMP/package-lock.json"

echo "4/4 Archive"
(cd "$TMP" && rm -f "$RACINE/lambda.zip" && zip -qr "$RACINE/lambda.zip" . )
ls -lh "$RACINE/lambda.zip"
