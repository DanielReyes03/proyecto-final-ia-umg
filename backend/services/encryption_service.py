import os
from cryptography.fernet import Fernet
import json


def _get_fernet() -> Fernet:
    key = os.getenv("ENCRYPTION_KEY")
    if not key:
        raise ValueError("ENCRYPTION_KEY not set in environment")
    return Fernet(key.encode() if isinstance(key, str) else key)


def encrypt_config(config: dict) -> str:
    f = _get_fernet()
    return f.encrypt(json.dumps(config).encode()).decode()


def decrypt_config(encrypted: str) -> dict:
    f = _get_fernet()
    return json.loads(f.decrypt(encrypted.encode()).decode())
