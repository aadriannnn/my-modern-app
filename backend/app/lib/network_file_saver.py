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
        logger.info(f"[NETWORK SAVE] Host: {host if host else '(local)'}")
        logger.info(f"[NETWORK SAVE] Folder: {shared_folder}")
        logger.info(f"[NETWORK SAVE] Subfolder: {subfolder if subfolder else '(none)'}")
        logger.info(f"[NETWORK SAVE] Dimensiune conținut: {len(content)} caractere")

        # LOG CONTENT PREVIEW
        preview_len = 500
        content_preview = content[:preview_len] + "..." if len(content) > preview_len else content
        logger.info(f"[NETWORK SAVE] Content preview (first {preview_len} chars):\n{content_preview}")

        try:
            # Validare parametri
            # Dacă avem host, trebuie să avem și folder. Dacă nu avem host, folderul trebuie să fie absolut (local).
            if not shared_folder:
                error_msg = "Configurare incompletă: lipsește folderul de salvare"
                logger.error(f"[NETWORK SAVE] EROARE VALIDARE: {error_msg}")
                return False, error_msg, ""

            is_posix = os.name == 'posix'

            # Validare specifică Linux/Docker
            if is_posix and host and host.lower() not in ['localhost', '127.0.0.1', 'local']:
                error_msg = (
                    f"Pe Linux/Docker nu sunt suportate căile UNC de Windows (\\\\{host}). "
                    f"Vă rugăm să montați share-ul în container și să folosiți o cale locală "
                    f"(lăsați Host gol și puneți calea de mount la Folder, ex: /app/mnt_juridic)."
                )
                logger.error(f"[NETWORK SAVE] EROARE OS: {error_msg}")
                return False, error_msg, ""

            # Generăm numele fișierului dacă nu s-a specificat
            if filename is None:
                filename = NetworkFileSaver.generate_unique_filename()

            logger.info(f"[NETWORK SAVE] Nume fișier: {filename}")

            # Construim calea
            if not host or (is_posix and host.lower() in ['local', 'localhost']):
                # Cale locală (sau mount point)
                base_path = shared_folder
                if subfolder:
                    network_path = os.path.join(base_path, subfolder, filename)
                else:
                    network_path = os.path.join(base_path, filename)
            else:
                # Cale UNC Windows
                if subfolder:
                    network_path = f"\\\\{host}\\{shared_folder}\\{subfolder}\\{filename}"
                else:
                    network_path = f"\\\\{host}\\{shared_folder}\\{filename}"

            logger.info(f"[NETWORK SAVE] Cale țintă: {network_path}")

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

            logger.error(f"[NETWORK SAVE] {error_msg}")
            logger.exception(e)
            logger.error("=" * 70)
            return False, error_msg, network_path if 'network_path' in locals() else ""

    @staticmethod
    async def poll_for_response(
        saved_path: str,
        timeout_seconds: int = 1200,
        poll_interval: int = 10
    ) -> Tuple[bool, str, str]:
        """
        Polling pentru fișierul de răspuns după salvarea promptului în rețea.

        Args:
            saved_path: Calea completă unde a fost salvat promptul
            timeout_seconds: Timeout-ul maxim pentru polling (default: 1200s = 20 min)
            poll_interval: Interval între verificări în secunde (default: 10s)

        Returns:
            Tuple[bool, str, str]: (success, content_or_error, response_path)
            - success: True dacă răspunsul a fost găsit, False la timeout
            - content_or_error: Conținutul fișierului de răspuns sau mesaj de eroare
            - response_path: Calea completă a fișierului de răspuns

        Example:
            >>> success, content, path = await NetworkFileSaver.poll_for_response(
            ...     saved_path="/path/to/prompt_20251128_121648.txt"
            ... )
        """
        import asyncio

        logger.info("=" * 70)
        logger.info("[NETWORK POLLING] Începem polling pentru răspuns...")
        logger.info(f"[NETWORK POLLING] Prompt salvat la: {saved_path}")
        logger.info(f"[NETWORK POLLING] Timeout: {timeout_seconds}s")
        logger.info(f"[NETWORK POLLING] Interval polling: {poll_interval}s")

        try:
            # Extragem directorul și numele fișierului
            directory = os.path.dirname(saved_path)
            prompt_filename = os.path.basename(saved_path)

            # Construim pattern pentru fișierul de răspuns
            # Pattern: raspuns_+_prompt_[numele_fisier_prompt]
            response_filename = f"raspuns_+_prompt_{prompt_filename}"
            response_path = os.path.join(directory, response_filename)

            logger.info(f"[NETWORK POLLING] Căutăm fișier: {response_filename}")
            logger.info(f"[NETWORK POLLING] Cale completă: {response_path}")

            # Calculăm numărul maxim de iterații
            max_iterations = timeout_seconds // poll_interval
            iteration = 0

            logger.info(f"[NETWORK POLLING] Iterații maxime: {max_iterations}")
            logger.info("=" * 70)

            # Începem polling
            while iteration < max_iterations:
                iteration += 1

                # Verificăm dacă fișierul există
                if os.path.exists(response_path):
                    logger.info("=" * 70)
                    logger.info(f"[NETWORK POLLING] ✅ RĂSPUNS GĂSIT la iterația {iteration}!")
                    logger.info(f"[NETWORK POLLING] Cale: {response_path}")

                    try:
                        # Citim conținutul
                        with open(response_path, 'r', encoding='utf-8') as f:
                            content = f.read()

                        logger.info(f"[NETWORK POLLING] ✓ Conținut citit: {len(content)} caractere")

                        # Preview conținut
                        preview_len = 500
                        content_preview = content[:preview_len] + "..." if len(content) > preview_len else content
                        logger.info(f"[NETWORK POLLING] Preview răspuns:\n{content_preview}")
                        logger.info("=" * 70)

                        return True, content, response_path

                    except Exception as read_error:
                        error_msg = f"Eroare la citirea răspunsului: {str(read_error)}"
                        logger.error(f"[NETWORK POLLING] ❌ {error_msg}")
                        return False, error_msg, response_path

                # Logging periodic pentru a arăta că polling-ul este activ
                if iteration % 6 == 0:  # La fiecare minut (6 iterații x 10s)
                    elapsed_time = iteration * poll_interval
                    logger.info(f"[NETWORK POLLING] Așteptăm răspuns... ({elapsed_time}s / {timeout_seconds}s)")

                # Așteptăm înainte de următoarea verificare
                await asyncio.sleep(poll_interval)

            # Timeout - nu am găsit răspunsul
            logger.error("=" * 70)
            logger.error("[NETWORK POLLING] ❌ TIMEOUT")
            logger.error(f"[NETWORK POLLING] Nu s-a primit răspuns în {timeout_seconds}s")
            logger.error(f"[NETWORK POLLING] Fișier așteptat: {response_filename}")
            logger.error("=" * 70)

            error_msg = f"Timeout: Nu s-a primit răspuns în {timeout_seconds // 60} minute. Verificați că procesul extern generează fișierul '{response_filename}' în același director."
            return False, error_msg, response_path

        except Exception as e:
            error_msg = f"Eroare neașteptată în polling: {str(e)}"
            logger.error("=" * 70)
            logger.error(f"[NETWORK POLLING] ❌ EROARE GENERALĂ")
            logger.error(f"[NETWORK POLLING] {error_msg}")
            logger.exception(e)
            logger.error("=" * 70)
            return False, error_msg, ""

    @staticmethod
    def delete_response_file(response_path: str) -> Tuple[bool, str]:
        """
        Șterge fișierul de răspuns după ce a fost procesat.

        Args:
            response_path: Calea completă către fișierul de răspuns

        Returns:
            Tuple[bool, str]: (success, message)
            - success: True dacă ștergerea a reușit, False altfel
            - message: Mesaj descriptiv (succes sau eroare)

        Example:
            >>> success, msg = NetworkFileSaver.delete_response_file(
            ...     response_path="/path/to/raspuns_+_prompt_20251128_121648.txt"
            ... )
        """
        logger.info("=" * 70)
        logger.info("[NETWORK CLEANUP] Începem curățarea fișierului de răspuns...")
        logger.info(f"[NETWORK CLEANUP] Fișier de șters: {response_path}")

        try:
            # Verificăm dacă fișierul există
            if not os.path.exists(response_path):
                warning_msg = "Fișierul nu mai există (poate a fost deja șters)"
                logger.warning(f"[NETWORK CLEANUP] ⚠️ {warning_msg}")
                logger.info("=" * 70)
                return True, warning_msg  # Nu e o eroare critică

            # Obținem dimensiunea pentru logging
            file_size = os.path.getsize(response_path)
            logger.info(f"[NETWORK CLEANUP] Dimensiune fișier: {file_size} bytes")

            # Ștergem fișierul
            os.remove(response_path)

            # Verificăm că a fost șters
            if os.path.exists(response_path):
                error_msg = "Fișierul există încă după ștergere!"
                logger.error(f"[NETWORK CLEANUP] ❌ {error_msg}")
                logger.error("=" * 70)
                return False, error_msg

            logger.info("[NETWORK CLEANUP] ✅ Fișier șters cu succes")
            logger.info("=" * 70)

            success_msg = f"Fișier de răspuns șters cu succes: {os.path.basename(response_path)}"
            return True, success_msg

        except PermissionError as e:
            error_msg = f"Eroare permisiuni: Nu am acces de ștergere la fișierul {response_path}"
            logger.error("=" * 70)
            logger.error(f"[NETWORK CLEANUP] ❌ EROARE PERMISIUNI")
            logger.error(f"[NETWORK CLEANUP] {error_msg}")
            logger.error(f"[NETWORK CLEANUP] Detalii: {str(e)}")
            logger.error("=" * 70)
            return False, error_msg

        except Exception as e:
            error_msg = f"Eroare la ștergerea fișierului: {str(e)}"
            logger.error("=" * 70)
            logger.error(f"[NETWORK CLEANUP] ❌ EROARE GENERALĂ")
            logger.error(f"[NETWORK CLEANUP] {error_msg}")
            logger.exception(e)
            logger.error("=" * 70)
            return False, error_msg
