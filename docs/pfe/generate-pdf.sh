#!/usr/bin/env bash
# Génère RAPPORT-PFE.pdf à partir de RAPPORT-PFE.md
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
MD="$ROOT/docs/pfe/RAPPORT-PFE.md"
PDF="$ROOT/docs/pfe/RAPPORT-PFE.pdf"

if [[ ! -f "$MD" ]]; then
  echo "Fichier introuvable: $MD" >&2
  exit 1
fi

echo "Génération du PDF depuis $MD ..."
cd "$ROOT"
if command -v python3 >/dev/null 2>&1 && python3 -c "import fpdf" 2>/dev/null; then
  python3 "$ROOT/docs/pfe/generate-pdf.py"
elif command -v npx >/dev/null 2>&1; then
  echo "fpdf2 absent — tentative md-to-pdf (peut télécharger Chromium)..."
  npx --yes md-to-pdf "$MD"
else
  echo "Installez fpdf2: pip3 install fpdf2" >&2
  exit 1
fi
if [[ ! -f "$PDF" ]]; then
  echo "Échec: $PDF introuvable après conversion." >&2
  exit 1
fi
echo "PDF créé: $PDF"
