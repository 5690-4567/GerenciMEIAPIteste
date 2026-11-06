from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import get_db
from models.categorias import Categoria, TipoCategoria

router = APIRouter(prefix="/categorias", tags=["Categorias"])


class CategoriaEntrada(BaseModel):
    nome: str = Field(min_length=1, max_length=100)
    tipo: TipoCategoria
    ativa: bool = True

    @field_validator("nome")
    @classmethod
    def validar_nome(cls, valor: str) -> str:
        valor = valor.strip()
        if not valor:
            raise ValueError("O nome não pode ficar vazio.")
        return valor


class CategoriaSaida(CategoriaEntrada):
    model_config = ConfigDict(from_attributes=True)
    id: int


def buscar_categoria(id: int, db: Session) -> Categoria:
    categoria = db.get(Categoria, id)
    if categoria is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Categoria não encontrada.",
        )
    return categoria


@router.get("/{id}", response_model=CategoriaSaida)
def obter_categoria(id: int, db: Session = Depends(get_db)):
    return buscar_categoria(id, db)


@router.get("/", response_model=list[CategoriaSaida])
def listar_categorias(db: Session = Depends(get_db)):
    return db.scalars(select(Categoria).order_by(Categoria.id)).all()


@router.post("/", response_model=CategoriaSaida, status_code=status.HTTP_201_CREATED)
def criar_categoria(dados: CategoriaEntrada, db: Session = Depends(get_db)):
    categoria = Categoria(**dados.model_dump())
    db.add(categoria)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Já existe uma categoria com esse nome e tipo.")
    db.refresh(categoria)
    return categoria


@router.put("/{id}", response_model=CategoriaSaida)
def atualizar_categoria(id: int, dados: CategoriaEntrada, db: Session = Depends(get_db)):
    categoria = buscar_categoria(id, db)
    for campo, valor in dados.model_dump().items():
        setattr(categoria, campo, valor)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Já existe uma categoria com esse nome e tipo.")
    db.refresh(categoria)
    return categoria


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def excluir_categoria(id: int, db: Session = Depends(get_db)):
    categoria = buscar_categoria(id, db)
    try:
        db.delete(categoria)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Categoria em uso, não pode ser excluída.")