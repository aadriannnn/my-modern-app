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

            # Construim calea către fișier
            is_posix = os.name == 'posix'

            if not retea_host or (is_posix and retea_host.lower() in ['local', 'localhost']):
                # Cale locală
                file_path = os.path.join(retea_folder, PromptLogger.PROMPT_LOG_FILENAME)
            else:
                # Cale UNC Windows
                file_path = f"\\\\{retea_host}\\{retea_folder}\\{PromptLogger.PROMPT_LOG_FILENAME}"

            logger.info(f"[PROMPT LOGGER] Cale fișier: {file_path}")

            # Verificăm dacă fișierul există
            if os.path.exists(file_path):
                logger.info("[PROMPT LOGGER] Fișierul există, îl citim...")

                with open(file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)

                # Validăm structura
                if "round_1_entries" not in data:
                    logger.warning("[PROMPT LOGGER] Structură invalidă, recreăm...")
                    data = {"round_1_entries": []}

                logger.info(f"[PROMPT LOGGER] ✓ Încarcat cu {len(data['round_1_entries'])} intrări")
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
            logger.info("[PROMPT LOGGER] Salvăm datele în rețea...")

            # Convertim datele în JSON string
            json_content = json.dumps(data, ensure_ascii=False, indent=2)

            logger.info(f"[PROMPT LOGGER] Dimensiune JSON: {len(json_content)} caractere")

            # Salvăm folosind NetworkFileSaver
            success, message, saved_path = NetworkFileSaver.save_to_network(
                content=json_content,
                host=retea_host,
                shared_folder=retea_folder,
                subfolder='',
                filename=PromptLogger.PROMPT_LOG_FILENAME
            )

            if success:
                logger.info(f"[PROMPT LOGGER] ✅ Salvat: {saved_path}")
            else:
                logger.error(f"[PROMPT LOGGER] ❌ Eroare salvare: {message}")

            return success

        except Exception as e:
            logger.error(f"[PROMPT LOGGER] ❌ Excepție la salvare: {e}")
            logger.exception(e)
            return False
