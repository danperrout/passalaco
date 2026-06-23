# Passa Laço Fantasias

Catálogo online de fantasias da loja [Passa Laço](https://www.passalaco.com.br), hospedado via GitHub Pages.

## O que faz

- Lista fantasias carregadas de `output/fantasias.json`
- Filtros por categoria, sexo e tipo
- Busca por nome ou ID, com suporte a palavras similares (busca fuzzy)
- Ordenação por nome (A-Z / Z-A) ou por mais vistas
- Paginação (100 itens por página)
- Lazy load de imagens
- Modal com detalhes e contagem de visualizações (salvo em localStorage)
- Botão "Estou sem ideia!" para sortear uma fantasia aleatória
- Exibe a data da última atualização do catálogo

## Estrutura

```
index.html              # Interface principal
main.js                 # Lógica de filtro, busca, renderização e paginação
styles.css              # Estilos customizados
output/fantasias.json   # Fonte de dados principal
db.js                   # Lista de nomes e categorias (usado na geração do JSON)
```

## Rodar localmente

```bash
python -m http.server
```

Acesse `http://localhost:8000`.

> Necessário servidor HTTP para que o `fetch` do `fantasias.json` funcione corretamente.
