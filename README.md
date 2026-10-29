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
- Botão "Reservar pelo WhatsApp" em cada fantasia, com mensagem pronta (código, nome e link)
- Vídeos e posts do Instagram e do Facebook num carrossel junto com a foto da fantasia (cadastrados em
  `videos.json`), com selo no card
- Lupa na foto (ou toque na foto) abre a imagem em tela cheia: pinça ou toque duplo para ampliar,
  arrastar para ver os detalhes e arrastar para baixo para fechar; no computador, clique e roda do mouse
- Cada fantasia tem endereço fixo com código e nome (`/f/8423-enfermeira/`), que abre direto nela, e botão de compartilhar
  (folha de compartilhar do celular ou cópia do link no computador) com prévia de foto, nome e descrição
- Exibe a data da última atualização do catálogo

## Design

A interface segue os princípios de design da Apple traduzidos para a web: fonte do sistema,
materiais translúcidos, uma única cor de destaque, feedback no toque e movimento com molas
interrompíveis (damping ratio + response), projeção de momento e resistência elástica na folha
de detalhes. A foto voa do card até a folha (e volta ao fechar), "Sortear outra" desliza o
conteúdo como um baralho e os cards de uma página nova entram em cascata pelo lado da navegação. Respeita `prefers-reduced-motion`, `prefers-reduced-transparency` e `prefers-contrast`.

## Estrutura

```
videos.json             # Vídeos e posts do Instagram/Facebook por código de fantasia
loja.json               # Dados da loja: nome, logo, cores, WhatsApp, endereço (ver "Nova loja")
index.html              # Interface principal
sobre.html              # Página "Nossa loja": história, endereço, horário, contatos e redes
assets/js/main.js       # Filtros, busca, renderização, paginação e animações
assets/styles.css       # Estilos (CSS puro, sem dependências)
output/fantasias.json   # Fonte de dados principal
output/analises.json    # Análise visual de cada fantasia (gerado, ver abaixo)
assets/js/db.js         # Lista de nomes e categorias (usado na geração do JSON)
scripts/atualizar.py       # Atualiza tudo: os quatro scripts abaixo, em ordem (ver "Atualizar o catálogo")
scripts/extrair.py         # Baixa o catálogo da loja e grava output/*.json
scripts/analisar.py        # Gera data/analise/<id>_analise.json das fantasias sem análise (Ollama)
scripts/build_analises.py  # Junta data/analise/*_analise.json em output/analises.json
scripts/build_site.py      # Aplica loja.json e gera f/<código>-<nome>/ e sitemap.xml
scripts/test_extrair.py    # Testes do extrair.py
f/<código>-<nome>/      # Página fixa de cada fantasia (gerada, ver abaixo)
404.html                # Leva qualquer /f/<código>…/ para a fantasia
```

## Atualizar o catálogo

Um comando baixa o catálogo da loja, analisa as fantasias novas e regera o site:

```bash
python scripts/atualizar.py
```

Ele roda, em ordem:

1. `scripts/extrair.py`: baixa o `db.js` da loja (endereço em `catalogo`, no `loja.json`) e grava
   `output/fantasias.json`, `categorias.json`, `sexos.json` e `tipos.json`. Mantém o `criadoEm` de cada
   fantasia, marca as novas e alteradas com `atualizadoEm` e mostra as novas, alteradas e removidas.
2. `scripts/analisar.py`: gera a análise visual das fantasias que ainda não têm uma (ver "Análise visual").
3. `scripts/build_analises.py` e `scripts/build_site.py`.

Não faz commit: confira o `git diff` e depois faça commit e push. O GitHub Pages publica em alguns minutos.
Cada script também roda sozinho. Só Python 3, sem dependências.

## Análise visual

Cada fantasia pode ter uma descrição gerada por IA a partir da foto (cores, peças, material,
modelagem e tema), em `data/analise/<id>_analise.json`. O `scripts/analisar.py` gera as que faltam com o
modelo `gemma4:31b-cloud` (constante `MODELO` no script), pelo [Ollama](https://ollama.com) rodando no
computador e logado na conta (`ollama signin`). Se o Ollama não estiver rodando, ele avisa e pula: as
que faltarem ficam para a próxima vez. Fantasias sem foto no site da loja ficam sem análise.

O `scripts/build_analises.py` junta as análises das fantasias que estão no catálogo em
`output/analises.json`. As das que saíram ficam guardadas em `data/analise/` para quando voltarem.
O site carrega `output/analises.json` em paralelo com o catálogo e funciona normalmente sem ele.

## Endereço de cada fantasia

Cada fantasia tem uma página em `f/<código>-<nome>/index.html` (ex.: `f/8423-enfermeira/`) com as meta-tags de compartilhamento
(Open Graph, Twitter e JSON-LD), para o WhatsApp, Instagram, Facebook e buscadores mostrarem
foto, nome e descrição. A página leva o visitante para o catálogo com a fantasia aberta, e o
endereço volta a ser `f/<código>-<nome>/`.
Só o código importa: `/f/8423/` ou `/f/8423-qualquer-coisa/` também abrem a Enfermeira, pelo `404.html`. Depois de atualizar `output/fantasias.json` ou as análises, rode:

```bash
python scripts/build_site.py
```

O endereço do site vem de `endereco`, em `loja.json`. Fantasias novas que ainda não
têm página também abrem pelo link, mas sem a prévia no compartilhamento.

## Vídeos e posts

Vídeos (reels do Instagram ou do Facebook) e posts de foto do Instagram aparecem num carrossel
antes da foto da fantasia: arrasta-se para o lado (ou usa as setas, no computador). No celular,
a área cresce enquanto um vídeo está à vista. Coloque o link em `videos.json`, pelo código:

```json
{
    "8530": "https://www.instagram.com/reel/DeFuHgivsfK/",
    "6790": [
        "https://www.instagram.com/reel/DeFuHgivsfK/",
        "https://www.facebook.com/reel/2008852879768778/"
    ],
    "10150": "https://www.instagram.com/p/DWrzN-fFNEk/"
}
```

Fantasias com vídeo ou post aparecem primeiro: o vídeo/post é o primeiro item do carrossel, e a
fantasia vem antes nas listas (ordem padrão, categorias, busca e página inicial; ordenar por nome ou
mais vistas não muda).

Basta o link (o mesmo do botão "Copiar link" do Instagram ou do Facebook); o site monta o vídeo
incorporado. O endereço que aparece no código de incorporação do Facebook (`facebook.com/plugins/video.php?...`)
também funciona. Não precisa rodar nenhum script: o site lê o arquivo direto.

Vídeo do próprio site (toca sozinho no card, mudo e em loop): salve o arquivo como `data/videos/<código>.mp4` (ou `.mov`, `.m4v`, `.webm`) e rode `scripts/videos.sh`. O script tira o áudio, corta no centro para 9:16 (vertical), comprime (H.264, no máximo 720 de largura) e põe o vídeo como primeiro link da fantasia em `videos.json`, mantendo os do Instagram/Facebook. Vídeos já registrados são pulados; `scripts/videos.sh -f` recomprime todos.

## Nova loja

O site serve para qualquer loja de aluguel de fantasias. Tudo o que é da loja fica em `loja.json`:

| Campo | O que é |
|---|---|
| `nome`, `nomeCurto` | Nome completo (títulos, compartilhamento) e curto ("Olha essa fantasia da …") |
| `descricao` | Descrição do site para o Google e para a prévia do link da página inicial |
| `endereco` | Endereço público do site, terminado em `/` (usado nos links compartilhados e no sitemap) |
| `logo` | Endereço da imagem do logo, largura e altura originais |
| `catalogo` | `url` do `db.js` com o catálogo da loja e `imagens`, endereço das fotos com `{id}` no lugar do código |
| `siteDaLoja` | Link do site institucional no rodapé (deixe `url` vazio para esconder) |
| `whatsapp` | `numero` com DDI e DDD só com dígitos (ex.: `5531988416629`), `exibicao` para o rodapé e `mensagem` com `{codigo}`, `{nome}` e `{link}`. Sem número, o botão some |
| `contato` | `endereco` da loja física (também usado no "Como chegar" do Google Maps), `horario` (lista de `dias` e `horas`), `telefones`, `email` e `redes` (nome → link, ex.: Instagram, Facebook). Aparece no rodapé e na página "Nossa loja" |
| `fotoDaLoja` | `url` e `descricao` da foto da loja, no topo da página "Nossa loja" e na prévia do link dela |
| `historia` | Parágrafos do texto da página "Nossa loja" |
| `cores` | `destaque` (botões, links), `fundo` e `faixa` (listra colorida no topo) |
| `categorias` | "De para" de nomes de categoria (ex.: `"Paises": "Países"`), para corrigir nomes que o catálogo de origem traz errados. Links antigos com o nome original continuam funcionando |

Para montar uma loja nova:

1. Troque `loja.json` e o ícone `assets/favicon.png`.
2. Coloque o catálogo em `output/fantasias.json` (campos `_id`, `nome`, `imgUrl`, `categoriaNome`,
   `sexo`, `tipo`) e, se houver, as análises das fotos (ver "Análise visual"). Se a loja usa o mesmo
   sistema de `db.js` da Passa Laço, basta preencher `catalogo` e rodar `python scripts/atualizar.py`.
3. Rode `python scripts/build_site.py`. Ele aplica `loja.json` no `index.html`, no `sobre.html` e no `404.html`
   (trechos entre `<!-- loja:... -->` e `<!-- /loja:... -->`, que não devem ser editados à mão)
   e gera as páginas das fantasias e o `sitemap.xml`.

As datas comemorativas e as categorias com emoji estão em `assets/js/main.js` e valem para lojas do Brasil.

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
