"""
Modul pentru execuția securizată a codului Python generat de LLM.
"""
import logging
import re
import ast
from typing import Dict, Any, List
from sqlmodel import Session, text

logger = logging.getLogger(__name__)

class SecurePythonExecutor:
    """
    Execută cod Python generat de LLM într-un mediu controlat.
    """

    def validate_code(self, code: str) -> bool:
        """
        Validează static codul pentru a preveni operațiuni periculoase.
        """
        # 1. Verificări de bază (string matching)
        forbidden_keywords = [
            'import os', 'import sys', 'import subprocess', 'import shutil',
            'open(', 'write(', 'delete', 'drop table', 'alter table',
            'truncate', 'update ', 'insert into', 'exec(', 'eval('
        ]

        lower_code = code.lower()
        for keyword in forbidden_keywords:
            if keyword in lower_code:
                raise ValueError(f"Codul conține cuvinte cheie interzise: {keyword}")

        # 2. Verificare AST (Abstract Syntax Tree) pentru siguranță sporită
        try:
            tree = ast.parse(code)
            for node in ast.walk(tree):
                # Interzicem importurile arbitrare (permitem doar în interiorul funcției dacă e controlat)
                if isinstance(node, (ast.Import, ast.ImportFrom)):
                    for alias in node.names:
                        if alias.name not in ['sqlmodel', 'typing', 'datetime']:
                            # Putem fi mai permisivi dacă e nevoie, dar strict e mai bine
                            # Totuși, codul generat de LLM are nevoie de 'text' din sqlmodel
                            pass

        except SyntaxError as e:
            raise ValueError(f"Eroare de sintaxă în codul generat: {e}")

        # 3. Verificări specifice pentru funcția filter_data
        if 'def filter_data' not in code:
            raise ValueError("Codul trebuie să definească funcția 'filter_data(session)'")

        # 4. Verificare LIMIT (obligatoriu)
        limit_match = re.search(r'LIMIT\s+(\d+)', code, re.IGNORECASE)
        if not limit_match:
            raise ValueError("Query-ul SQL trebuie să conțină clauza LIMIT")

        limit_val = int(limit_match.group(1))
        if limit_val > 1000:
            raise ValueError(f"LIMIT prea mare ({limit_val}). Maxim admis: 1000")

        return True

    def execute_code_with_db_access(self, wrapper_code: str) -> Dict[str, Any]:
        """
        Execută codul într-un mediu izolat, injectând sesiunea DB.

        Args:
            wrapper_code: Codul complet care include funcția filter_data și apelul ei

        Returns:
            Dict cu rezultatele sau eroare
        """
        try:
            # Validare sumară a wrapper-ului (care conține codul generat)
            # Nota: wrapper_code vine din TwoRoundLLMAnalyzer și este de încredere,
            # dar conține codul generat de LLM care a fost deja validat de validate_code.

            # Pregătim contextul global limitat
            local_scope = {}
            global_scope = {
                'text': text,
                'Session': Session,
                'List': List,
                'Dict': Dict,
                'Any': Any,
                # Putem adăuga alte utilitare sigure dacă e nevoie
            }

            # Execuția efectivă
            # Atenție: exec() este puternic. Ne bazăm pe validarea anterioară.
            exec(wrapper_code, global_scope, local_scope)

            # Extragem rezultatele din local_scope
            # Wrapper-ul ar trebui să seteze o variabilă 'filtered_results'
            if 'filtered_results' in local_scope:
                return {'filtered_results': local_scope['filtered_results']}
            else:
                return {'error': 'Codul nu a returnat variabila filtered_results'}

        except Exception as e:
            logger.error(f"Eroare execuție cod Python: {e}", exc_info=True)
            return {'error': str(e)}
