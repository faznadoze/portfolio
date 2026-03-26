#!/bin/bash
# Agência Doze — Atualizar Portfolio
# Execute este script sempre que adicionar novos arquivos às pastas de portfolio.
# Ele irá escanear todas as pastas e gerar o arquivo manifest.json automaticamente.

PORTFOLIO_DIR="$(dirname "$0")/portfolio"
MANIFEST="$PORTFOLIO_DIR/manifest.json"

echo "🔍 Escaneando pastas de portfolio..."

SERVICES=("catalogo" "arte_rs" "video_ed" "video_ce" "motion" "anim3d" "fooh" "landing" "website" "foto" "embalagem" "impresso" "identidade" "trafego" "estoque")

echo "{" > "$MANIFEST"

for i in "${!SERVICES[@]}"; do
  SVC="${SERVICES[$i]}"
  DIR="$PORTFOLIO_DIR/$SVC"
  
  FILES=()
  if [ -d "$DIR" ]; then
    while IFS= read -r -d '' file; do
      BASENAME=$(basename "$file")
      EXT="${BASENAME##*.}"
      EXT_LOWER=$(echo "$EXT" | tr '[:upper:]' '[:lower:]')
      case "$EXT_LOWER" in
        jpg|jpeg|png|gif|webp|avif|svg)
          FILES+=("{\"file\":\"portfolio/$SVC/$BASENAME\",\"type\":\"image\"}")
          ;;
        mp4|webm|mov|avi|mkv)
          FILES+=("{\"file\":\"portfolio/$SVC/$BASENAME\",\"type\":\"video\"}")
          ;;
        pdf)
          FILES+=("{\"file\":\"portfolio/$SVC/$BASENAME\",\"type\":\"pdf\"}")
          ;;
      esac
    done < <(find "$DIR" -maxdepth 1 -type f \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" -o -iname "*.gif" -o -iname "*.webp" -o -iname "*.avif" -o -iname "*.svg" -o -iname "*.mp4" -o -iname "*.webm" -o -iname "*.mov" -o -iname "*.avi" -o -iname "*.mkv" -o -iname "*.pdf" \) -print0 2>/dev/null | sort -z)
  fi

  # Build JSON array
  FILES_JSON=""
  for j in "${!FILES[@]}"; do
    if [ $j -gt 0 ]; then
      FILES_JSON="$FILES_JSON,"
    fi
    FILES_JSON="$FILES_JSON${FILES[$j]}"
  done

  echo "  \"$SVC\": [$FILES_JSON]" >> "$MANIFEST"
  
  COUNT=${#FILES[@]}
  echo "  ✅ $SVC: $COUNT arquivo(s)"

  # Add comma except for last item
  if [ $i -lt $((${#SERVICES[@]} - 1)) ]; then
    # We'll add a comma — but we need to handle this in the JSON properly
    # Re-write last line with comma
    sed -i '' "$ s/$/,/" "$MANIFEST"
  fi
done

echo "}" >> "$MANIFEST"

echo ""
echo "✨ manifest.json gerado com sucesso em: $MANIFEST"
echo "   Abra agencia-doze.html no navegador para ver as atualizações."
