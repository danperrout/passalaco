"""Testes do parser do db.js e da mescla com o catálogo existente.

Uso: python scripts/test_extrair.py
"""

from extrair import mesclar, montar_catalogo

JS = """db.t=[0,"Outras",5,"Juninas"];
db.fk=["Abelha","Caipira"];
db.fv=[[8,0,6,9,0,9],[20,5,5]];"""

categorias, fantasias = montar_catalogo(JS, "https://loja/img/{id}.jpg", "agora")
assert categorias == [{"id": 0, "nome": "Outras"}, {"id": 5, "nome": "Juninas"}]
assert [(f["_id"], f["nome"], f["categoriaNome"], f["sexo"], f["tipo"]) for f in fantasias] == [
    (8, "Abelha", "Outras", "Feminina", "Infantil"),
    (9, "Abelha", "Outras", "Masculina", "Adulta"),
    (20, "Caipira", "Juninas", "Feminina", "Adulta"),
]
assert fantasias[0]["imgUrl"] == "https://loja/img/8.jpg"

existentes = [
    dict(fantasias[0], criadoEm="antes"),                          # igual: mantém o antigo
    dict(fantasias[1], nome="Abelhinha", criadoEm="antes"),        # alterada: preserva criadoEm
    dict(fantasias[2], _id=99, img=99, criadoEm="antes"),          # saiu do catálogo
]
_, novas_db = montar_catalogo(JS, "https://loja/img/{id}.jpg", "agora")
lista, novas, alteradas, removidas = mesclar(novas_db, existentes, "agora")
assert lista[0] is existentes[0] and "atualizadoEm" not in lista[0]
assert lista[1]["criadoEm"] == "antes" and lista[1]["atualizadoEm"] == "agora" and len(alteradas) == 1
assert [i["_id"] for i in novas] == [20] and novas[0]["atualizadoEm"] == "agora"
assert [i["_id"] for i in removidas] == [99]
print("ok")
