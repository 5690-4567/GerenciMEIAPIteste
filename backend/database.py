import os
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import URL, create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

caminho_env = Path(__file__).with_name(".env") 
load_dotenv(caminho_env, override=True)  

senha = os.getenv("DB_PASSWORD") 
if not senha:     
    raise 
RuntimeError("Configure DB_PASSWORD no arquivo .env.")  

url_banco = URL.create(drivername="postgresql+psycopg2", 
                       username=os.getenv("DB_USER", "postgres"), 
                       password=senha, host=os.getenv("DB_HOST", "localhost"), 
                       port=int(os.getenv("DB_PORT", "5432")), 
                       database=os.getenv("DB_NAME", "gerencimei"), 
                       )
engine = create_engine(url_banco, pool_pre_ping=True) 
SessionLocal = sessionmaker(bind=engine, autoflush=False)  
class Base(DeclarativeBase):     
    pass
def get_db():     
    db = SessionLocal()    
    try:         
        yield db  
    except Exception:         
        db.rollback()         
        raise     
    finally:         
        db.close() 