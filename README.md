# Passa Laço Fantasias

Catálogo online de fantasias da loja [Passa Laço](https://www.passalaco.com.br), hospedado via GitHub Pages.

## O que faz

- Página inicial com a data comemorativa do momento (Carnaval, Páscoa, Dia do Livro Infantil, Coroação, Festa Junina, Folclore, Primavera, Dia das Crianças, Halloween, Natal), próximas datas com contagem regressiva, Vitrine e categorias
- Lista fantasias carregadas de `output/fantasias.json`
- Categorias na barra lateral (fileira de chips no celular), sexo e tipo em controles segmentados
- Busca por nome ou ID, com suporte a palavras similares (busca fuzzy), e também por cor, peça ou tema descritos na análise visual
- Ordenação por nome (A-Z / Z-A) ou por mais vistas
- Paginação (100 itens por página) e filtros refletidos na URL
- Lazy load de imagens
- Detalhes em diálogo (desktop) ou folha inferior arrastável (celular), com contagem de visualizações (salvo em localStorage)
- Botão "Estou sem ideia" sorteia e abre uma fantasia aleatória
- Cada fantasia tem endereço fixo pelo código (`/f/9444/`), que abre direto nela, e botão de compartilhar
  (folha de compartilhar do celular ou cópia do link no computador) com prévia de foto, nome e descrição
- Exibe a data da última atualização do catálogo

## Design

A interface segue os princípios de design da Apple traduzidos para a web: fonte do sistema,
materiais translúcidos, uma única cor de destaque, feedback no toque e movimento com molas
interrompíveis (damping ratio + response), projeção de momento e resistência elástica na folha
de detalhes. Respeita `prefers-reduced-motion`, `prefers-reduced-transparency` e `prefers-contrast`.

## Estrutura

```
index.html              # Interface principal
assets/js/main.js       # Filtros, busca, renderização, paginação e animações
assets/styles.css       # Estilos (CSS puro, sem dependências)
output/fantasias.json   # Fonte de dados principal
output/analises.json    # Análise visual de cada fantasia (gerado, ver abaixo)
assets/js/db.js         # Lista de nomes e categorias (usado na geração do JSON)
scripts/build_analises.py  # Junta data/analise/*_analise.json em output/analises.json
scripts/build_paginas.py   # Gera f/<código>/index.html e sitemap.xml
f/<código>/index.html   # Página fixa de cada fantasia (gerada, ver abaixo)
404.html                # Leva /f/<código>/ ainda sem página gerada para a fantasia
```

## Análise visual

Cada fantasia pode ter uma descrição gerada por IA a partir da foto (cores, peças, material,
modelagem e tema), em `data/analise/<id>_analise.json`. Depois de atualizar essas análises, rode:

```bash
python scripts/build_analises.py
```

O site carrega `output/analises.json` em paralelo com o catálogo e funciona normalmente sem ele.

## Endereço de cada fantasia

Cada fantasia tem uma página em `f/<código>/index.html` com as meta-tags de compartilhamento
(Open Graph, Twitter e JSON-LD), para o WhatsApp, Instagram, Facebook e buscadores mostrarem
foto, nome e descrição. A página leva o visitante para o catálogo com a fantasia aberta, e o
endereço volta a ser `f/<código>/`. Depois de atualizar `output/fantasias.json` ou as análises, rode:

```bash
python scripts/build_paginas.py
```

O endereço do site fica em `SITE_URL`, no início do script. Fantasias novas que ainda não
têm página também abrem pelo link, graças ao `404.html`, mas sem a prévia no compartilhamento.

## Datas comemorativas

As datas ficam em `SEASONS` (`assets/js/main.js`): data do evento, janela de destaque
(dias antes/depois), categorias e termos que identificam as fantasias de cada tema.
Carnaval e Páscoa são calculados a partir da data da Páscoa de cada ano.

## Rodar localmente

```bash
python -m http.server
```

Acesse `http://localhost:8000`.

> Necessário servidor HTTP para que o `fetch` do `fantasias.json` funcione corretamente.
