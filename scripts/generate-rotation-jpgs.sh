#!/usr/bin/env bash
# Build public/rotation/rotation (1..20).jpg from PNG sources.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ASSETS="${CURSOR_ASSETS:-$HOME/.cursor/projects/Users-jram-octo-Desktop-side-effect-digital-model/assets}"
ROT="$ROOT/public/rotation"
ROT2D="$ROOT/public/rotation-2d"

mkdir -p "$ROT"

for i in $(seq 1 20); do
  shopt -s nullglob
  files=("$ASSETS"/Rotation__${i}_-*.png)
  src=""
  if [ ${#files[@]} -gt 0 ]; then
    src=$(ls -t "${files[@]}" | head -1)
  elif [ -f "$ROT2D/Rotation ($i).png" ]; then
    src="$ROT2D/Rotation ($i).png"
  elif [ -f "$ROT/Rotation ($i).png" ]; then
    src="$ROT/Rotation ($i).png"
  fi
  if [ -z "$src" ]; then
    echo "MISSING $i" >&2
    exit 1
  fi
  sips -s format jpeg -s formatOptions 90 "$src" --out "$ROT/rotation ($i).jpg" >/dev/null
  echo "rotation ($i).jpg <- $(basename "$src")"
done
