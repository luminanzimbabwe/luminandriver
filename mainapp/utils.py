# utils.py
import secrets

def create_simple_token():
    """
    Generates a secure 64-character token.
    Can be stored in MongoDB as auth_token.
    """
    return secrets.token_hex(32)  # 32 bytes → 64 hex chars
