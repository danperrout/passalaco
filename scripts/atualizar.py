"""Atualiza o site inteiro: extrai o catálogo, analisa as fantasias novas e regera análises, páginas e sitemap.

Não faz commit: confira o resumo e o git diff antes de publicar.

Uso: python scripts/atualizar.py
"""

import analisar
import build_analises
import build_site
import extrair


def main():
    print("== Catálogo")
    resumo = extrair.main()
    print("\n== Análises")
    analises = analisar.main()
    print("\n== Site")
    build_analises.main()
    build_site.main()
    print(f"\nPronto: {resumo['total']} fantasias ({resumo['novas']} novas, {resumo['alteradas']} alteradas, "
          f"{resumo['removidas']} removidas) e {analises} análises novas. Confira o git diff e faça commit e push.")


if __name__ == "__main__":
    main()
