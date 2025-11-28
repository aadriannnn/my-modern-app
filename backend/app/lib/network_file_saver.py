"""
Modul pentru salvarea fișierelor pe calculatoare din rețea.
Gestionează salvarea prompturilor LLM pe share-uri de rețea Windows.
"""
import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Tuple

logger = logging.getLogger(__name__)


class NetworkFileSaver:
    """Utility pentru salvarea fișierelor pe calculatoare din rețea."""

    @staticmethod
    def generate_unique_filename(prefix: str = "prompt", extension: str = ".txt") -> str:
        """
        Generează un nume de fișier unic bazat pe timestamp.

        Args:
            prefix: Prefix pentru nume fișier (default: "prompt")
            extension: Extensia fișierului (default: ".txt")

        Returns:
            str: Nume fișier în formatul: prefix_YYYYMMDD_HHMMSS.extension

        Example:
            >>> NetworkFileSaver.generate_unique_filename()
            'prompt_20251128_111635.txt'
        """
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        return f"{prefix}_{timestamp}{extension}"

    @staticmethod
    def save_to_network(
        content: str,
        host: str,
        shared_folder: str,
        subfolder: str = "",
        filename: str = None
    ) -> Tuple[bool, str, str]:
        """
        Salvează conținut într-un fișier text pe un calculator din rețea.

        Args:
            content: Conținutul fișierului de salvat
            host: IP sau hostname al calculatorului (ex: 192.168.1.32 sau DESKTOP-POCCKIN)
            shared_folder: Numele folderului partajat
            subfolder: Subfolder opțional în folderul partajat (default: "")
            filename: Nume fișier specific sau None pentru generare automată

        Returns:
            Tuple[bool, str, str]: (success, message, full_path)
            - success: True dacă salvarea a reușit, False altfel
            - message: Mesaj descriptiv (succes sau eroare)
            - full_path: Calea completă UNC unde a fost salvat fișierul (sau ar fi trebuit)

        Raises:
            Nu ridică excepții - returnează (False, error_message, path) în caz de eroare

        Example:
            >>> success, msg, path = NetworkFileSaver.save_to_network(
            ...     content="Test prompt",
            ...     host="192.168.1.32",
            ...     shared_folder="juridic"
            ... )
        """
        logger.info("=" * 70)
        logger.info("[NETWORK SAVE] Începem salvarea în rețea...")
        logger.info(f"[NETWORK SAVE] Host: {host}")
        logger.info(f"[NETWORK SAVE] Folder partajat: {shared_folder}")
        logger.info(f"[NETWORK SAVE] Subfolder: {subfolder if subfolder else '(none)'}")
        logger.info(f"[NETWORK SAVE] Dimensiune conținut: {len(content)} caractere")

        # LOG CONTENT PREVIEW
        preview_len = 500
        content_preview = content[:preview_len] + "..." if len(content) > preview_len else content
        logger.info(f"[NETWORK SAVE] Content preview (first {preview_len} chars):\n{content_preview}")

        try:
            # Validare parametri
            if not host or not shared_folder:
                error_msg = "Configurare incompletă: lipsește host sau folder partajat"
                logger.error(f"[NETWORK SAVE] EROARE VALIDARE: {error_msg}")
                return False, error_msg, ""

            # Generăm numele fișierului dacă nu s-a specificat
            if filename is None:
                filename = NetworkFileSaver.generate_unique_filename()

            logger.info(f"[NETWORK SAVE] Nume fișier: {filename}")

            # Construim calea UNC completă
            # Format: \\HOST\FOLDER\[SUBFOLDER\]FILENAME
            if subfolder:
                network_path = f"\\\\{host}\\{shared_folder}\\{subfolder}\\{filename}"
            else:
                network_path = f"\\\\{host}\\{shared_folder}\\{filename}"

            logger.info(f"[NETWORK SAVE] Cale completă UNC: {network_path}")

            # Verificăm dacă directorul părinte există
            parent_dir = str(Path(network_path).parent)
            logger.info(f"[NETWORK SAVE] Verificăm accesul la director: {parent_dir}")

            if not os.path.exists(parent_dir):
                logger.warning(f"[NETWORK SAVE] Directorul nu există, încercăm să-l creăm...")
                try:
                    os.makedirs(parent_dir, exist_ok=True)
                    logger.info(f"[NETWORK SAVE] ✓ Director creat cu succes")
                except PermissionError as mkdir_perm_error:
                    error_msg = (
                        f"Nu am permisiune de creare directory pe {host}\\{shared_folder}. "
                        f"Verifică că folderul partajat are permisiuni de 'Write/Modificare'."
                    )
                    logger.error(f"[NETWORK SAVE] EROARE PERMISIUNI (mkdir): {error_msg}")
                    logger.error(f"[NETWORK SAVE] Detalii: {str(mkdir_perm_error)}")
                    return False, error_msg, network_path
                except Exception as mkdir_error:
                    error_msg = f"Nu pot crea directorul {parent_dir}: {str(mkdir_error)}"
                    logger.error(f"[NETWORK SAVE] EROARE (mkdir): {error_msg}")
                    return False, error_msg, network_path
            else:
                logger.info(f"[NETWORK SAVE] ✓ Directorul există și este accesibil")

            # Scriem fișierul
            logger.info(f"[NETWORK SAVE] Scriem {len(content)} caractere în fișier...")
            with open(network_path, "w", encoding="utf-8") as f:
                f.write(content)

            # VERIFICARE POST-SALVARE
            logger.info("[NETWORK SAVE] VERIFICARE POST-SALVARE...")
            if os.path.exists(network_path):
                file_size = os.path.getsize(network_path)
                logger.info(f"[NETWORK SAVE] ✓ Fișierul există pe disc.")
                logger.info(f"[NETWORK SAVE] ✓ Dimensiune fișier: {file_size} bytes.")

                if file_size == 0 and len(content) > 0:
                     logger.warning("[NETWORK SAVE] ⚠️ ATENȚIE: Fișierul a fost creat dar are 0 bytes!")
            else:
                error_msg = f"Fișierul NU a fost găsit pe disc după scriere: {network_path}"
                logger.error(f"[NETWORK SAVE] ❌ EROARE VERIFICARE: {error_msg}")
                return False, error_msg, network_path

            logger.info("=" * 70)
            logger.info(f"[NETWORK SAVE] ✅ SUCCES! Fișier salvat: {network_path}")
            logger.info("=" * 70)

            success_msg = f"Prompt salvat cu succes în rețea: {filename}"
            return True, success_msg, network_path

        except PermissionError as e:
            error_msg = (
                f"Eroare permisiuni: Nu am acces de scriere la \\\\{host}\\{shared_folder}. "
                f"Verifică că ai drepturi de 'Write/Modificare' pe folderul partajat."
            )
            logger.error("=" * 70)
            logger.error(f"[NETWORK SAVE] ❌ EROARE PERMISIUNI")
            logger.error(f"[NETWORK SAVE] {error_msg}")
            logger.error(f"[NETWORK SAVE] Detalii tehnice: {str(e)}")
            logger.error("=" * 70)
            return False, error_msg, network_path if 'network_path' in locals() else ""

        except FileNotFoundError as e:
            error_msg = (
                f"Eroare rețea: Nu pot accesa \\\\{host}\\{shared_folder}. "
                f"Verifică că: (1) IP-ul {host} este corect, "
                f"(2) calculatorul este pornit și conectat la rețea, "
                f"(3) folderul '{shared_folder}' este partajat."
            )
            logger.error("=" * 70)
            logger.error(f"[NETWORK SAVE] ❌ EROARE REȚEA/FOLDER INEXISTENT")
            logger.error(f"[NETWORK SAVE] {error_msg}")
            logger.error(f"[NETWORK SAVE] Detalii tehnice: {str(e)}")
            logger.error("=" * 70)
            return False, error_msg, network_path if 'network_path' in locals() else ""

        except OSError as e:
            # OSError poate include diverse probleme de I/O, inclusiv erori de rețea
            error_msg = (
                f"Eroare sistem de fișiere: {str(e)}. "
                f"Verifică conexiunea la rețea și configurația folderului partajat."
            )
            logger.error("=" * 70)
            logger.error(f"[NETWORK SAVE] ❌ EROARE OS/I/O")
            logger.error(f"[NETWORK SAVE] {error_msg}")
            logger.error(f"[NETWORK SAVE] Detalii tehnice: {str(e)}")
            logger.error("=" * 70)
            return False, error_msg, network_path if 'network_path' in locals() else ""

        except Exception as e:
            error_msg = f"Eroare neașteptată la salvarea în rețea: {str(e)}"
            logger.error("=" * 70)
            logger.error(f"[NETWORK SAVE] ❌ EROARE GENERALĂ/NEAȘTEPTATĂ")
            logger.error(f"[NETWORK SAVE] {error_msg}")
            logger.exception(e)
            logger.error("=" * 70)
            return False, error_msg, network_path if 'network_path' in locals() else ""
