"""Gera a análise visual das fantasias que ainda não têm uma, com o Ollama.

Precisa do Ollama rodando em localhost, logado na conta (`ollama signin`) para usar o modelo cloud.
Grava data/analise/<id>_analise.json, que o scripts/build_analises.py junta em output/analises.json.
Se o Ollama não responder, avisa e termina sem erro: as que faltarem ficam para a próxima vez.

Uso: python scripts/analisar.py
"""

import base64
import json
import os
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone

from extrair import USER_AGENT

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DESTINO = os.path.join(ROOT, "data", "analise")
OLLAMA = "http://localhost:11434"
MODELO = "gemma4:31b-cloud"

PROMPT = """Analise a fantasia da imagem. Responda SOMENTE com JSON válido, em português, neste formato:
{
  "cores_predominantes": [],
  "pecas_inclusas": [],
  "material_visual": "",
  "estilo_corte": "",
  "acessorios_visiveis": [],
  "tematica_detalhada": ""
}
tematica_detalhada: personagem ou tema da fantasia, em uma frase."""


def ler_json(resposta):
    # o modelo às vezes devolve o JSON dentro de ```json ... ```
    return json.loads(resposta[resposta.find("{"):resposta.rfind("}") + 1])


def analisar(img_bytes):
    payload = {
        "model": MODELO,
        "prompt": PROMPT,
        "images": [base64.b64encode(img_bytes).decode()],
        "stream": False,
        "options": {"temperature": 0.1},
    }
    req = urllib.request.Request(f"{OLLAMA}/api/generate", data=json.dumps(payload).encode(),
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=300) as resp:
        return ler_json(json.load(resp)["response"])


def baixar_foto(url):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read()


def main():
    try:
        urllib.request.urlopen(f"{OLLAMA}/api/tags", timeout=5).close()
    except OSError as e:
        print(f"Aviso: Ollama não respondeu em {OLLAMA} ({e}); análises puladas")
        return 0

    with open(os.path.join(ROOT, "output", "fantasias.json"), encoding="utf-8") as f:
        fantasias = json.load(f)
    faltando = [i for i in fantasias if not os.path.exists(os.path.join(DESTINO, f"{i['_id']}_analise.json"))]
    print(f"{len(faltando)} fantasias sem análise")

    feitas = 0
    for n, item in enumerate(faltando, start=1):
        prefixo = f"[{n}/{len(faltando)}] {item['_id']} {item['nome']}"
        try:
            foto = baixar_foto(item["imgUrl"])
        except urllib.error.HTTPError as e:
            print(f"{prefixo}: foto indisponível ({e.code})")
            continue
        except OSError as e:
            print(f"{prefixo}: erro ao baixar a foto ({e})")
            continue
        try:
            t0 = time.time()
            visual = analisar(foto)
            tempo = time.time() - t0
        except (OSError, ValueError, KeyError) as e:
            print(f"{prefixo}: erro na análise ({e})")
            continue
        agora = datetime.now().astimezone()
        data = {
            "id": item["_id"],
            "nome_original": item["nome"],
            "sexo": item["sexo"],
            "tipo": item["tipo"],
            "categoriaNome": item["categoriaNome"],
            "analise_visual": visual,
            "imgUrl": item["imgUrl"],
            "modelo": MODELO,
            "provider": "ollama",
            "tempo_analise_sec": round(tempo, 2),
            "data_analise": agora.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "data_criacao": agora.isoformat(),
        }
        with open(os.path.join(DESTINO, f"{item['_id']}_analise.json"), "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        feitas += 1
        print(f"{prefixo} ({tempo:.1f}s)")

    print(f"{feitas} análises novas em data/analise/")
    return feitas


if __name__ == "__main__":
    main()
