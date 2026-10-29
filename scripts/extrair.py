"""Baixa o catálogo da loja (db.js) e grava output/fantasias.json, categorias.json, sexos.json e tipos.json.

O endereço do db.js e das fotos vem de "catalogo" em loja.json. Mescla com o
output/fantasias.json atual: preserva criadoEm e marca novas e alteradas com atualizadoEm.
Mostra as fantasias novas, alteradas e removidas.

Uso: python scripts/extrair.py
"""

import ast
import json
import os
import re
import sys
import urllib.request
from datetime import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT = os.path.join(ROOT, "output")
# o servidor da loja responde 406 a User-Agents que não parecem de navegador
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36"

# Códigos de sexo/tipo usados no db.js da loja
SEXO_TIPO = {
    "5": {"sexo": "Feminina", "tipo": "Adulta"},
    "6": {"sexo": "Feminina", "tipo": "Infantil"},
    "10": {"sexo": "Masculina", "tipo": "Infantil"},
    "9": {"sexo": "Masculina", "tipo": "Adulta"},
}


def baixar(url):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=60) as resp:
        # o servidor não informa o charset; o arquivo é Latin-1
        return resp.read().decode("latin-1")


def extrair_lista(js, nome):
    match = re.search(re.escape(nome) + r"\s*=\s*(\[.*?\]);", js, re.DOTALL)
    if not match:
        raise ValueError(f"{nome} não encontrado no db.js")
    return ast.literal_eval(match.group(1))


def montar_catalogo(js, imagens, agora):
    """Lê db.t (categorias), db.fk (nomes) e db.fv (variantes: foto, categoria, sexo/tipo, de 3 em 3)."""
    db_t = extrair_lista(js, "db.t")
    nomes = extrair_lista(js, "db.fk")
    variantes = extrair_lista(js, "db.fv")
    if len(nomes) != len(variantes):
        raise ValueError(f"db.fk ({len(nomes)}) e db.fv ({len(variantes)}) têm tamanhos diferentes")

    categorias = [{"id": db_t[i], "nome": db_t[i + 1]} for i in range(0, len(db_t) - 1, 2)]
    nome_categoria = {c["id"]: c["nome"] for c in categorias}

    fantasias = []
    for nome, fv in zip(nomes, variantes):
        if len(fv) % 3:
            print(f"Aviso: variantes malformadas para '{nome}' ({len(fv)} valores), pulando")
            continue
        for j in range(0, len(fv), 3):
            img_id, cat_id, codigo = fv[j], fv[j + 1], str(fv[j + 2]).strip()
            sexo_tipo = SEXO_TIPO.get(codigo, {"sexo": "N/A", "tipo": "N/A"})
            fantasias.append({
                "nome": nome,
                "_id": img_id,
                "img": img_id,
                "imgUrl": imagens.format(id=img_id),
                "categoria": cat_id,
                "categoriaNome": nome_categoria.get(cat_id, "Outras"),
                "sexo": sexo_tipo["sexo"],
                "tipo": sexo_tipo["tipo"],
                "criadoEm": agora,
            })
    return categorias, fantasias


def dados(item):
    return {k: v for k, v in item.items() if k not in ("criadoEm", "atualizadoEm")}


def mesclar(fantasias, existentes, agora):
    """Mantém o item antigo quando nada mudou; senão preserva criadoEm e marca atualizadoEm."""
    por_id = {item["_id"]: item for item in existentes}
    lista, novas, alteradas = [], [], []
    for item in fantasias:
        antigo = por_id.get(item["_id"])
        if antigo is None:
            item["atualizadoEm"] = agora
            novas.append(item)
        elif dados(antigo) != dados(item):
            item["criadoEm"] = antigo.get("criadoEm", agora)
            item["atualizadoEm"] = agora
            alteradas.append((antigo, item))
        else:
            item = antigo
        lista.append(item)
    ids = {item["_id"] for item in fantasias}
    removidas = [item for item in existentes if item["_id"] not in ids]
    return lista, novas, alteradas, removidas


def gravar(nome, data):
    with open(os.path.join(OUTPUT, nome), "w", encoding="utf-8") as f:
        f.write(json.dumps(data, indent=2, ensure_ascii=False))


def main():
    with open(os.path.join(ROOT, "loja.json"), encoding="utf-8") as f:
        catalogo = json.load(f)["catalogo"]
    agora = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    print(f"Baixando {catalogo['url']}...")
    categorias, fantasias = montar_catalogo(baixar(catalogo["url"]), catalogo["imagens"], agora)
    if not fantasias:
        sys.exit("Nenhuma fantasia no db.js; output/ não foi alterado")

    caminho = os.path.join(OUTPUT, "fantasias.json")
    existentes = []
    if os.path.exists(caminho):
        with open(caminho, encoding="utf-8") as f:
            existentes = json.load(f)
    lista, novas, alteradas, removidas = mesclar(fantasias, existentes, agora)

    print(f"Novas: {len(novas)}")
    for item in novas:
        print(f"  + [{item['_id']}] {item['nome']} ({item['categoriaNome']}, {item['sexo']}/{item['tipo']})")
    print(f"Alteradas: {len(alteradas)}")
    for antigo, item in alteradas:
        mudancas = ", ".join(f"{k}: {antigo.get(k)!r} -> {v!r}" for k, v in dados(item).items() if antigo.get(k) != v)
        print(f"  ~ [{item['_id']}] {item['nome']}: {mudancas}")
    print(f"Removidas: {len(removidas)}")
    for item in removidas:
        print(f"  - [{item['_id']}] {item['nome']} ({item.get('categoriaNome')})")

    gravar("categorias.json", categorias)
    gravar("fantasias.json", lista)
    gravar("sexos.json", [{"nome": s} for s in sorted({i["sexo"] for i in lista})])
    gravar("tipos.json", [{"nome": t} for t in sorted({i["tipo"] for i in lista})])
    print(f"{len(lista)} fantasias e {len(categorias)} categorias gravadas em output/")
    return {"novas": len(novas), "alteradas": len(alteradas), "removidas": len(removidas), "total": len(lista)}


if __name__ == "__main__":
    main()
