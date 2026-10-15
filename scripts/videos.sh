#!/usr/bin/env bash
# Comprime os vídeos de data/videos/ e registra cada um em videos.json pelo nome do arquivo.
#
# Uso: coloque o vídeo em data/videos/<código>.<ext> (ex.: 9554.mp4, 2389.mov) e rode
#   scripts/videos.sh        # só os vídeos que ainda não estão em videos.json
#   scripts/videos.sh -f     # recomprime todos (piora a qualidade de quem já foi comprimido)
#
# Cada vídeo sai sem áudio, em H.264 com no máximo 720 de largura, como data/videos/<código>.mp4.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIR="$ROOT/data/videos"
JSON="$ROOT/videos.json"
FORCE=0
[[ "${1:-}" == "-f" ]] && FORCE=1

command -v ffmpeg >/dev/null || { echo "ffmpeg não encontrado (sudo apt install ffmpeg)" >&2; exit 1; }

# Já registrado em videos.json como vídeo do site?
registered() {
    python3 - "$JSON" "$1" <<'EOF'
import json, sys
data = json.load(open(sys.argv[1], encoding='utf-8'))
links = data.get(sys.argv[2], [])
sys.exit(0 if f'data/videos/{sys.argv[2]}.mp4' in ([links] if isinstance(links, str) else links) else 1)
EOF
}

# Põe o vídeo do site como primeiro link da fantasia, mantendo os do Instagram/Facebook
register() {
    python3 - "$JSON" "$1" <<'EOF'
import json, sys
path, code = sys.argv[1], sys.argv[2]
data = json.load(open(path, encoding='utf-8'))
local = f'data/videos/{code}.mp4'
links = data.get(code, [])
links = [links] if isinstance(links, str) else links
links = [local] + [l for l in links if l != local]
data[code] = links[0] if len(links) == 1 else links
data = dict(sorted(data.items(), key=lambda kv: int(kv[0])))
with open(path, 'w', encoding='utf-8') as f:
    f.write(json.dumps(data, ensure_ascii=False, indent=4) + '\n')
EOF
}

shopt -s nullglob nocaseglob
done_count=0
for src in "$DIR"/*.{mp4,mov,m4v,webm}; do
    name="$(basename "$src")"
    code="${name%.*}"
    if [[ ! "$code" =~ ^[0-9]+$ ]]; then
        echo "⚠ $name: o nome precisa ser o código da fantasia (ex.: 9554.mp4); pulando"
        continue
    fi
    dest="$DIR/$code.mp4"
    if [[ $FORCE -eq 0 && "$src" == "$dest" ]] && registered "$code"; then
        continue
    fi
    if ! grep -q "\"_id\": *\"\?$code\"\?[,}]" "$ROOT/output/fantasias.json" 2>/dev/null; then
        echo "⚠ $name: código $code não está em output/fantasias.json (confira o nome)"
    fi

    tmp="$(mktemp --suffix=.mp4)"
    before=$(du -k "$src" | cut -f1)
    echo "→ $name"
    ffmpeg -v error -y -i "$src" -an -c:v libx264 -crf 28 -preset slow \
        -vf "scale='min(720,iw)':-2" -pix_fmt yuv420p -movflags +faststart "$tmp"
    mv "$tmp" "$dest"
    chmod 644 "$dest"
    [[ "$src" != "$dest" ]] && rm -f "$src"
    register "$code"
    after=$(du -k "$dest" | cut -f1)
    echo "  ${before} KB → ${after} KB, registrado em videos.json"
    done_count=$((done_count + 1))
done

echo "$done_count vídeo(s) processado(s)."
