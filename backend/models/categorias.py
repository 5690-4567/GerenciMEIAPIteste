import enum

from sqlalchemy import BigInteger, Boolean, Identity, String, text
from sqlalchemy.dialects.postgresql import ENUM
from sqlalchemy.orm import Mapped, mapped_column 

from database import Base  

class TipoCategoria(str, enum.Enum):   
    RECEITA ="receita"  
    DESPESA ="despesa"

class Categoria(Base): 
    __tablename__ = "categoria"     
    __table_args__ = {"schema": "public"}   

    id: Mapped[int] = mapped_column(
                    BigInteger,         
                    Identity(always=True),         
                    primary_key=True,     
    )     
    nome: Mapped[str] = mapped_column(
                        String(100),         
                        nullable=False,     
    )     
    tipo: Mapped[TipoCategoria] = mapped_column(
                                ENUM(
                                    TipoCategoria,
                                    name="tipo_categoria",
                                    schema="public",
                                    create_type=False,
                                    values_callable=lambda e: [m.value for m in e],
                                    ),        
                                    nullable=False,     
                                )     
    ativa: Mapped[bool] = mapped_column(
                        Boolean,  
                        nullable=False,
                        server_default=text("true")    
                                ) 
        
    