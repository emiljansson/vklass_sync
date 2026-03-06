"""Authentication models"""
from pydantic import BaseModel


class AuthLogin(BaseModel):
    password: str
