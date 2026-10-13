"""Gera uma página fixa por fantasia em f/<código>/index.html e o sitemap.xml.

Cada página tem as meta-tags de compartilhamento (Open Graph, Twitter, JSON-LD),
para o WhatsApp, Instagram, Facebook e buscadores mostrarem foto, nome e descrição,
e leva o visitante direto para a fantasia aberta no catálogo.

Rode de novo sempre que output/fantasias.json ou output/analises.json mudarem.

Uso: python scripts/build_paginas.py
"""

import html
import json
import os
import re
import shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE_URL = "https://danperrout.github.io/passalaco/"
SITE_NAME = "Passa Laço Fantasias"
FANTASIAS = os.path.join(ROOT, "output", "fantasias.json")
ANALISES = os.path.join(ROOT, "output", "analises.json")
PAGES_DIR = os.path.join(ROOT, "f")
SITEMAP = os.path.join(ROOT, "sitemap.xml")

TEMPLATE = """<!DOCTYPE html>
<html lang="pt-BR">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#fff8f1">
    <title>{title}</title>
    <meta name="description" content="{description}">
    <link rel="canonical" href="{url}">
    <link rel="icon" type="image/png" href="../../assets/favicon.png">

    <meta property="og:type" content="website">
    <meta property="og:site_name" content="{site_name}">
    <meta property="og:locale" content="pt_BR">
    <meta property="og:url" content="{url}">
    <meta property="og:title" content="{name}">
    <meta property="og:description" content="{description}">
    <meta property="og:image" content="{image}">
    <meta property="og:image:alt" content="{name}">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="{name}">
    <meta name="twitter:description" content="{description}">
    <meta name="twitter:image" content="{image}">

    <script type="application/ld+json">{json_ld}</script>
    <script>location.replace('../../' + (location.search ? location.search + '&' : '?') + 'fantasia={id}' + location.hash);</script>
</head>

<body>
    <p><a href="../../?fantasia={id}">Ver {name} no catálogo da Passa Laço</a></p>
</body>

</html>
"""


def display_name(fantasia):
    nome = (fantasia.get("nome") or "").strip()
    return f"Fantasia #{fantasia['_id']}" if nome in ("", ".") else nome


def describe(fantasia, analise):
    partes = [fantasia.get("categoriaNome") or ""]
    detalhes = [v for v in (fantasia.get("sexo"), fantasia.get("tipo")) if v and v != "N/A"]
    if detalhes:
        partes.append(" ".join(v.lower() for v in detalhes))
    resumo = ", ".join(p for p in partes if p)
    texto = f"{resumo}. " if resumo else ""
    tema = (analise or {}).get("t", "")
    if tema:
        texto += tema.rstrip(".") + ". "
    texto += f"Código #{fantasia['_id']}. Aluguel de fantasias na Passa Laço."
    return texto if len(texto) <= 300 else texto[:297].rstrip() + "…"


def page(fantasia, analise):
    fid = fantasia["_id"]
    name = display_name(fantasia)
    url = f"{SITE_URL}f/{fid}/"
    description = describe(fantasia, analise)
    image = fantasia.get("imgUrl") or ""
    json_ld = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": name,
        "sku": str(fid),
        "image": image,
        "description": description,
        "category": fantasia.get("categoriaNome") or "",
        "url": url,
        "brand": {"@type": "Brand", "name": SITE_NAME},
    }
    esc = lambda s: html.escape(s, quote=True)
    return TEMPLATE.format(
        title=esc(f"{name} — {SITE_NAME}"),
        name=esc(name),
        description=esc(description),
        url=esc(url),
        image=esc(image),
        site_name=esc(SITE_NAME),
        id=fid,
        # "</" dentro do JSON fecharia a tag <script>
        json_ld=json.dumps(json_ld, ensure_ascii=False).replace("</", "<\\/"),
    )


def main():
    with open(FANTASIAS, encoding="utf-8") as f:
        fantasias = json.load(f)
    try:
        with open(ANALISES, encoding="utf-8") as f:
            analises = json.load(f)
    except FileNotFoundError:
        analises = {}

    ids = set()
    for fantasia in fantasias:
        fid = fantasia["_id"]
        ids.add(str(fid))
        target = os.path.join(PAGES_DIR, str(fid), "index.html")
        os.makedirs(os.path.dirname(target), exist_ok=True)
        content = page(fantasia, analises.get(str(fid)))
        # Só reescreve o que mudou, para o git mostrar apenas as diferenças reais
        try:
            with open(target, encoding="utf-8") as f:
                if f.read() == content:
                    continue
        except FileNotFoundError:
            pass
        with open(target, "w", encoding="utf-8") as f:
            f.write(content)

    # Fantasias que saíram do catálogo
    removed = 0
    for entry in os.listdir(PAGES_DIR):
        if re.fullmatch(r"\d+", entry) and entry not in ids:
            shutil.rmtree(os.path.join(PAGES_DIR, entry))
            removed += 1

    urls = [SITE_URL] + [f"{SITE_URL}f/{fid}/" for fid in sorted(ids, key=int)]
    with open(SITEMAP, "w", encoding="utf-8") as f:
        f.write('<?xml version="1.0" encoding="UTF-8"?>\n')
        f.write('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n')
        for url in urls:
            f.write(f"  <url><loc>{html.escape(url)}</loc></url>\n")
        f.write("</urlset>\n")

    print(f"{len(ids)} páginas em f/ ({removed} removidas) e {len(urls)} endereços no sitemap.xml")


if __name__ == "__main__":
    main()
