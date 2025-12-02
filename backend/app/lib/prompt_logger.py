"""
Modul pentru logging-ul prompturilor și răspunsurilor AI Round 1.
Salvează toate interacțiunile Round 1 într-un fișier JSON în locația din rețea.
"""
import logging
import json
import os
from datetime import datetime
from typing import Dict, Any, Optional
from .network_file_saver import NetworkFileSaver

logger = logging.getLogger(__name__)


class PromptLogger:
    """Utility pentru logging-ul prompturilor și răspunsurilor AI Round 1."""

    PROMPT_LOG_FILENAME = "prompt.json"

    @staticmethod
    def save_round_1_entry(
        user_query: str,
        prompt: str,
        python_code_response: str,
        execution_status: str,
        filtered_cases_count: int,
        error_message: Optional[str] = None,
        retea_host: str = "",
        retea_folder: str = ""
    ) -> bool:
        """
        Salvează o intrare Round 1 în prompt.json în locația din rețea.

        Args:
            user_query: Întrebarea utilizatorului
            prompt: Promptul complet trimis către AI
            python_code_response: Codul Python returnat de AI
            execution_status: Status execuție ("success" sau "error")
            filtered_cases_count: Numărul de cazuri filtrate (0 la eroare)
            error_message: Mesaj de eroare (dacă există)
            retea_host: Host-ul din rețea (din setări)
            retea_folder: Folderul partajat din rețea (din setări)

        Returns:
            bool: True dacă salvarea a reușit, False altfel

        Note:
            Această metodă nu ridică excepții - returnează False la eroare
            pentru a nu bloca fluxul principal de analiză.
        """
        try:
            logger.info("=" * 70)
            logger.info("[PROMPT LOGGER] Începem salvarea intrării Round 1...")

            # Construim intrarea nouă
            new_entry = {
                "timestamp": datetime.now().isoformat(),
                "user_query": user_query,
                "prompt": prompt,
                "python_code_response": python_code_response,
                "execution_status": execution_status,
                "filtered_cases_count": filtered_cases_count,
                "error_message": error_message
            }

            logger.info(f"[PROMPT LOGGER] Status: {execution_status}")
            logger.info(f"[PROMPT LOGGER] Cazuri filtrate: {filtered_cases_count}")

            # Încărcăm datele existente
            existing_data = PromptLogger._load_existing_data(retea_host, retea_folder)

            # Adăugăm noua intrare
            existing_data["round_1_entries"].append(new_entry)

            logger.info(f"[PROMPT LOGGER] Total intrări: {len(existing_data['round_1_entries'])}")

            # Salvăm datele actualizate
            success = PromptLogger._save_data(existing_data, retea_host, retea_folder)

            if success:
                logger.info("[PROMPT LOGGER] ✅ Intrare salvată cu succes!")
            else:
                logger.error("[PROMPT LOGGER] ❌ Salvarea a eșuat")

            logger.info("=" * 70)
            return success

        except Exception as e:
            logger.error("=" * 70)
            logger.error(f"[PROMPT LOGGER] ❌ EROARE la salvarea intrării: {e}")
            logger.exception(e)
            logger.error("=" * 70)
            return False

    @staticmethod
    def _get_prompt_file_path(retea_host: str, retea_folder: str) -> str:
        """
        Construiește calea către fișierul prompt.json în mod consistent.
        Această metodă asigură că citirea și scrierea folosesc EXACT aceeași cale.

        Args:
            retea_host: Host-ul din rețea
            retea_folder: Folderul partajat din rețea

        Returns:
            str: Calea completă către prompt.json
        """
        is_posix = os.name == 'posix'

        if not retea_host or (is_posix and retea_host.lower() in ['local', 'localhost']):
            # Cale locală (POSIX sau Windows local path)
            file_path = os.path.join(retea_folder, PromptLogger.PROMPT_LOG_FILENAME)
        else:
            # Cale UNC Windows
            file_path = f"\\\\{retea_host}\\{retea_folder}\\{PromptLogger.PROMPT_LOG_FILENAME}"

        return file_path

    @staticmethod
    def _load_existing_data(retea_host: str, retea_folder: str) -> Dict[str, Any]:
        """
        Încarcă datele existente din prompt.json sau creează structura inițială.

        Args:
            retea_host: Host-ul din rețea
            retea_folder: Folderul partajat din rețea

        Returns:
            Dict cu structura JSON (existentă sau nouă)
        """
        try:
            logger.info("[PROMPT LOGGER] Verificăm dacă există prompt.json...")

            # Folosim metoda centralizată pentru calea fișierului
            file_path = PromptLogger._get_prompt_file_path(retea_host, retea_folder)

            logger.info(f"[PROMPT LOGGER] Cale fișier (READ): {file_path}")

            # Log file size if exists
            if os.path.exists(file_path):
                file_size = os.path.getsize(file_path)
                logger.info(f"[PROMPT LOGGER] Fișierul există, dimensiune: {file_size} bytes")

            # Verificăm dacă fișierul există
            if os.path.exists(file_path):

                with open(file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)

                # Validăm structura
                if "round_1_entries" not in data:
                    logger.warning("[PROMPT LOGGER] Structură invalidă, recreăm...")
                    data = {"round_1_entries": []}

                entries_count = len(data['round_1_entries'])
                logger.info(f"[PROMPT LOGGER] ✓ Încarcat cu {entries_count} intrări")
                return data
            else:
                logger.info("[PROMPT LOGGER] Fișierul nu există, creăm structură nouă")
                return {"round_1_entries": []}

        except json.JSONDecodeError as e:
            logger.error(f"[PROMPT LOGGER] Eroare parsare JSON, recreăm structura: {e}")
            return {"round_1_entries": []}
        except Exception as e:
            logger.error(f"[PROMPT LOGGER] Eroare la încărcare, creăm structură nouă: {e}")
            return {"round_1_entries": []}

    @staticmethod
    def _save_data(data: Dict[str, Any], retea_host: str, retea_folder: str) -> bool:
        """
        Salvează datele JSON în prompt.json în locația din rețea.

        Args:
            data: Datele JSON de salvat
            retea_host: Host-ul din rețea
            retea_folder: Folderul partajat din rețea

        Returns:
            bool: True dacă salvarea a reușit, False altfel
        """
        try:
            entries_count = len(data.get('round_1_entries', []))
            logger.info(f"[PROMPT LOGGER] Salvăm datele în rețea (total {entries_count} intrări)...")

            # Convertim datele în JSON string
            json_content = json.dumps(data, ensure_ascii=False, indent=2)

            logger.info(f"[PROMPT LOGGER] Dimensiune JSON: {len(json_content)} caractere")

            # Salvăm folosind NetworkFileSaver cu filename fix pentru a rescrie fișierul complet
            success, message, saved_path = NetworkFileSaver.save_to_network(
                content=json_content,
                host=retea_host,
                shared_folder=retea_folder,
                subfolder='',
                filename=PromptLogger.PROMPT_LOG_FILENAME  # Nume fix pentru a overwrite
            )

            if success:
                logger.info(f"[PROMPT LOGGER] ✅ Salvat: {saved_path}")

                # VERIFICARE POST-SALVARE: Confirmăm că datele au fost scrise corect
                verify_path = PromptLogger._get_prompt_file_path(retea_host, retea_folder)
                logger.info(f"[PROMPT LOGGER] Cale verificare (WRITE): {verify_path}")

                if os.path.exists(verify_path):
                    verify_size = os.path.getsize(verify_path)
                    logger.info(f"[PROMPT LOGGER] ✓ Verificare: fișier există, {verify_size} bytes")

                    # Verificăm că numărul de intrări e corect
                    try:
                        with open(verify_path, 'r', encoding='utf-8') as f:
                            verify_data = json.load(f)
                        verify_entries = len(verify_data.get('round_1_entries', []))
                        logger.info(f"[PROMPT LOGGER] ✓ Verificare: {verify_entries} intrări confirmate")

                        if verify_entries != entries_count:
                            logger.error(f"[PROMPT LOGGER] ⚠️ ATENȚIE: Am salvat {entries_count} intrări dar verificarea arată {verify_entries}!")
                    except Exception as ve:
                        logger.warning(f"[PROMPT LOGGER] Nu am putut verifica conținutul: {ve}")
                else:
                    logger.error(f"[PROMPT LOGGER] ⚠️ ATENȚIE: Fișierul NU există după salvare la {verify_path}!")
            else:
                logger.error(f"[PROMPT LOGGER] ❌ Eroare salvare: {message}")

            return success

        except Exception as e:
            logger.error(f"[PROMPT LOGGER] ❌ Excepție la salvare: {e}")
            logger.exception(e)
            return False
