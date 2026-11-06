import enum

from sqlalchemy import BigInteger, Identity, Text
from sqlalchemy.dialects.postgresql import ENUM
from sqlalchemy.orm import Mapped, mapped_column 

from database import Base  
class PerfilUsuario(str, enum.Enum):  
    ADMINISTRADOR ="ADMINISTRADOR"   
    EMPREENDEDOR_MEI ="EMPREENDEDOR_MEI"
class Perfil(Base):    
    __tablename__ = "perfil"     
    __table_args__ = {"schema": "public"}  

    id: Mapped[int] = mapped_column(
                    BigInteger,         
                    Identity(always=True),         
                    primary_key=True,     
    )     
    nome: Mapped[PerfilUsuario] = mapped_column(
    ENUM(
        PerfilUsuario, 
        name="perfil_usuario",
        schema="public",
        create_type=False,
        values_callable=lambda e: [m.value for m in e],),
        nullable=False,
        unique=True,
    )
    descricao: Mapped[str|None] = mapped_column(Text, nullable=True)
    
