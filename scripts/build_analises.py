"""Junta as análises visuais de data/analise/*_analise.json em output/analises.json.

O site carrega esse arquivo único (em vez de milhares de arquivos) para mostrar
descrição, cores e itens de cada fantasia e para ampliar a busca.

Uso: python scripts/build_analises.py
"""

import glob
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE = os.path.join(ROOT, "data", "analise", "*_analise.json")
TARGET = os.path.join(ROOT, "output", "analises.json")


def clean_list(values, lower=False):
    seen, result = set(), []
    for value in values or []:
        if not isinstance(value, str):
            continue
        value = value.strip()
        if lower:
            value = value.lower()
        key = value.lower()
        if value and key not in seen:
            seen.add(key)
            result.append(value)
    return result


def clean_text(value):
    return value.strip() if isinstance(value, str) else ""


def main():
    analises = {}
    for path in sorted(glob.glob(SOURCE)):
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        visual = data.get("analise_visual") or {}
        entry = {
            "t": clean_text(visual.get("tematica_detalhada")),
            "c": clean_list(visual.get("cores_predominantes"), lower=True),
            "p": clean_list(visual.get("pecas_inclusas")),
            "a": clean_list(visual.get("acessorios_visiveis")),
            "m": clean_text(visual.get("material_visual")),
            "e": clean_text(visual.get("estilo_corte")),
        }
        entry = {k: v for k, v in entry.items() if v}
        if entry:
            analises[str(data["id"])] = entry

    with open(TARGET, "w", encoding="utf-8") as f:
        json.dump(analises, f, ensure_ascii=False, separators=(",", ":"))
    print(f"{len(analises)} análises gravadas em {os.path.relpath(TARGET, ROOT)}")


if __name__ == "__main__":
    main()
