"""Monta o site da loja a partir de loja.json e do catálogo.

- Aplica loja.json (nome, logo, cores, WhatsApp, endereço) no index.html e no
  404.html, nos trechos marcados com <!-- loja:... --> <!-- /loja:... -->.
- Gera uma página fixa por fantasia em f/<código>-<nome>/index.html, com as
  meta-tags de compartilhamento (Open Graph, Twitter, JSON-LD), para o WhatsApp,
  Instagram, Facebook e buscadores mostrarem foto, nome e descrição.
- Gera o sitemap.xml.

Rode de novo sempre que loja.json, output/fantasias.json ou output/analises.json mudarem.

Uso: python scripts/build_site.py
"""

import html
import json
import os
import re
import shutil
import unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
with open(os.path.join(ROOT, "loja.json"), encoding="utf-8") as _f:
    LOJA = json.load(_f)
SITE_URL = LOJA["endereco"].rstrip("/") + "/"
SITE_NAME = LOJA["nome"]
SHORT_NAME = LOJA.get("nomeCurto") or SITE_NAME
# "De para" de categorias: corrige nomes que o catálogo de origem traz sem acento
CATEGORIAS = LOJA.get("categorias") or {}


def category_name(fantasia):
    nome = fantasia.get("categoriaNome") or ""
    return CATEGORIAS.get(nome, nome)
FANTASIAS = os.path.join(ROOT, "output", "fantasias.json")
ANALISES = os.path.join(ROOT, "output", "analises.json")
PAGES_DIR = os.path.join(ROOT, "f")
SITEMAP = os.path.join(ROOT, "sitemap.xml")

TEMPLATE = """<!DOCTYPE html>
<html lang="pt-BR">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="{bg}">
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
    <p><a href="../../?fantasia={id}">Ver {name} no catálogo da {short_name}</a></p>
</body>

</html>
"""


def slugify(text):
    # Mesma regra de slugify() em assets/js/main.js
    text = "".join(c for c in unicodedata.normalize("NFD", text) if not ("\u0300" <= c <= "\u036f"))
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def page_name(fantasia):
    nome = (fantasia.get("nome") or "").strip()
    slug = "" if nome == "." else slugify(nome)
    return f"{fantasia['_id']}-{slug}" if slug else str(fantasia["_id"])


def display_name(fantasia):
    nome = (fantasia.get("nome") or "").strip()
    return f"Fantasia #{fantasia['_id']}" if nome in ("", ".") else nome


def describe(fantasia, analise):
    partes = [category_name(fantasia)]
    detalhes = [v for v in (fantasia.get("sexo"), fantasia.get("tipo")) if v and v != "N/A"]
    if detalhes:
        partes.append(" ".join(v.lower() for v in detalhes))
    resumo = ", ".join(p for p in partes if p)
    texto = f"{resumo}. " if resumo else ""
    tema = (analise or {}).get("t", "")
    if tema:
        texto += tema.rstrip(".") + ". "
    texto += f"Código #{fantasia['_id']}. Aluguel de fantasias na {SHORT_NAME}."
    return texto if len(texto) <= 300 else texto[:297].rstrip() + "…"


def page(fantasia, analise):
    fid = fantasia["_id"]
    name = display_name(fantasia)
    url = f"{SITE_URL}f/{page_name(fantasia)}/"
    description = describe(fantasia, analise)
    image = fantasia.get("imgUrl") or ""
    json_ld = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": name,
        "sku": str(fid),
        "image": image,
        "description": description,
        "category": category_name(fantasia),
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
        short_name=esc(SHORT_NAME),
        bg=esc(LOJA["cores"]["fundo"]),
        id=fid,
        # "</" dentro do JSON fecharia a tag <script>
        json_ld=json.dumps(json_ld, ensure_ascii=False).replace("</", "<\\/"),
    )


# --- loja.json no index.html e no 404.html ---

def hex_rgb(color):
    color = color.lstrip("#")
    if len(color) == 3:
        color = "".join(c * 2 for c in color)
    return tuple(int(color[i:i + 2], 16) for i in (0, 2, 4))


def css_vars():
    cores = LOJA["cores"]
    tint, bg = cores["destaque"], cores["fundo"]
    faixa = cores.get("faixa") or [tint, tint]
    return (
        f"--tint: {tint}; --tint-rgb: {', '.join(map(str, hex_rgb(tint)))}; "
        f"--bg: {bg}; --material: rgba({', '.join(map(str, hex_rgb(bg)))}, 0.76); "
        f"--brand-stripe: linear-gradient(90deg, {', '.join(faixa)});"
    )


def runtime_config():
    # Só o que o main.js usa; "</" fecharia a tag <script>
    whatsapp = LOJA.get("whatsapp") or {}
    data = {
        "nome": SITE_NAME,
        "nomeCurto": SHORT_NAME,
        "whatsapp": re.sub(r"\D", "", whatsapp.get("numero", "")),
        "mensagemWhatsapp": whatsapp.get("mensagem", ""),
        "categorias": CATEGORIAS,
    }
    return json.dumps(data, ensure_ascii=False).replace("</", "<\\/")


def index_regions():
    esc = lambda s: html.escape(s, quote=True)
    title = f"{SITE_NAME} — Aluguel de fantasias"
    logo = LOJA["logo"]
    site = LOJA.get("siteDaLoja") or {}
    whatsapp = LOJA.get("whatsapp") or {}
    footer = []
    if site.get("url"):
        footer.append(f'<a href="{esc(site["url"])}">{esc(site.get("texto") or site["url"])}</a>')
    if whatsapp.get("numero"):
        numero = re.sub(r"\D", "", whatsapp["numero"])
        footer.append(f'<a href="https://wa.me/{numero}" target="_blank" rel="noopener">'
                      f'WhatsApp {esc(whatsapp.get("exibicao") or numero)}</a>')
    return {
        "cabecalho": f"""    <meta name="theme-color" content="{esc(LOJA["cores"]["fundo"])}">
    <title>{esc(title)}</title>
    <meta name="description" content="{esc(LOJA["descricao"])}">
    <link rel="canonical" href="{esc(SITE_URL)}">
    <link rel="icon" type="image/png" href="assets/favicon.png">

    <meta property="og:type" content="website">
    <meta property="og:site_name" content="{esc(SITE_NAME)}">
    <meta property="og:locale" content="pt_BR">
    <meta property="og:url" content="{esc(SITE_URL)}">
    <meta property="og:title" content="{esc(title)}">
    <meta property="og:description" content="{esc(LOJA["descricao"])}">
    <meta property="og:image" content="{esc(logo["url"])}">
    <meta name="twitter:card" content="summary">
    <style>:root {{ {css_vars()} }}</style>
    <script>window.LOJA = {runtime_config()};</script>""",
        "marca": f"""            <a class="brand" href="./" aria-label="{esc(SITE_NAME)} — início">
                <img src="{esc(logo["url"])}" alt="{esc(SITE_NAME)}" width="{logo.get("largura", 300)}"
                    height="{logo.get("altura", 100)}">
            </a>""",
        "rodape": "        <p>" + " · ".join(footer) + "</p>" if footer else "",
    }


def not_found_regions():
    esc = lambda s: html.escape(s, quote=True)
    return {
        "cabecalho404": f"""    <title>Página não encontrada — {esc(SITE_NAME)}</title>
    <style>:root {{ {css_vars()} }}</style>""",
        "inicio404": f"""        <p><a id="home" href="{esc(SITE_URL)}">Ver o catálogo de fantasias</a></p>""",
    }


def apply_regions(path, regions):
    with open(path, encoding="utf-8") as f:
        content = f.read()
    for name, body in regions.items():
        pattern = re.compile(rf"(<!-- loja:{name}\b[^>]*-->\n)(.*?)(\n[ \t]*<!-- /loja:{name} -->)", re.S)
        if not pattern.search(content):
            raise SystemExit(f"{os.path.relpath(path, ROOT)}: marcador loja:{name} não encontrado")
        content = pattern.sub(lambda m: m.group(1) + body + m.group(3), content)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)


def main():
    apply_regions(os.path.join(ROOT, "index.html"), index_regions())
    apply_regions(os.path.join(ROOT, "404.html"), not_found_regions())

    with open(FANTASIAS, encoding="utf-8") as f:
        fantasias = json.load(f)
    try:
        with open(ANALISES, encoding="utf-8") as f:
            analises = json.load(f)
    except FileNotFoundError:
        analises = {}

    names = []
    for fantasia in fantasias:
        fid = fantasia["_id"]
        names.append(page_name(fantasia))
        target = os.path.join(PAGES_DIR, names[-1], "index.html")
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

    # Fantasias que saíram do catálogo ou mudaram de nome (o link antigo segue
    # funcionando pelo 404.html, que só olha o código)
    removed = 0
    keep = set(names)
    for entry in os.listdir(PAGES_DIR):
        if re.match(r"\d+(-|$)", entry) and entry not in keep:
            shutil.rmtree(os.path.join(PAGES_DIR, entry))
            removed += 1

    names.sort(key=lambda name: int(name.split("-")[0]))
    urls = [SITE_URL] + [f"{SITE_URL}f/{name}/" for name in names]
    with open(SITEMAP, "w", encoding="utf-8") as f:
        f.write('<?xml version="1.0" encoding="UTF-8"?>\n')
        f.write('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n')
        for url in urls:
            f.write(f"  <url><loc>{html.escape(url)}</loc></url>\n")
        f.write("</urlset>\n")

    print(f"{len(names)} páginas em f/ ({removed} removidas) e {len(urls)} endereços no sitemap.xml")


if __name__ == "__main__":
    main()
