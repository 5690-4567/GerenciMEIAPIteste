
from sqlite3 import IntegrityError
from fastapi import APIRouter, Depends, HTTPException, status 
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.orm import Session 
from database import get_db 
from models.perfis import Perfil, PerfilUsuario

router = APIRouter(prefix="/perfis", tags=["perfil"])  

class PerfilEntrada(BaseModel):     
    nome: PerfilUsuario   
    descricao:str | None = None    
     
class PerfilSaida(PerfilEntrada):     
    model_config = ConfigDict(from_attributes=True)     
    id: int  

def buscar_perfil(id: int, db: Session) -> Perfil:     
    perfil = db.get(Perfil, id)    
    if perfil is None:         
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Perfil não encontrado.") 
    return perfil
@router.get("/[id]", response_model=PerfilSaida)
def obter_perfil(id: int, db: Session = Depends(get_db)):
    return  buscar_perfil(id, db)

@router.get("/", response_model=list[PerfilSaida])
def listar_perfis(db: Session = Depends(get_db)):
    return db.scalars(select(Perfil).order_by(Perfil.id)).all()


@router.post("/", response_model=PerfilSaida, status_code=status.HTTP_201_CREATED)
def criar_perfil(dados: PerfilEntrada, db: Session = Depends(get_db)):
    perfil = Perfil(**dados.model_dump())
    db.add(perfil)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Já existe um perfil com esse nome.")
    db.refresh(perfil)
    return perfil


@router.put("/{id}", response_model=PerfilSaida)
def atualizar_perfil(id: int, dados: PerfilEntrada, db: Session = Depends(get_db)):
    perfil = buscar_perfil(id, db)
    for campo, valor in dados.model_dump().items():
        setattr(perfil, campo, valor)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Já existe um perfil com esse nome.")
    db.refresh(perfil)
    return perfil


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def excluir_perfil(id: int, db: Session = Depends(get_db)):
    perfil = buscar_perfil(id, db)
    try:
        db.delete(perfil)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Perfil em uso, não pode ser excluído.")