from fastapi import FastAPI

from controller import perfis, categorias

app = FastAPI(title="GerenciMEI")

app.include_router(perfis.router)
app.include_router(categorias.router)


@app.get("/")
def raiz():
    return "GerenciMEI no ar"
