
import logging
from sqlmodel import Session, select
from .models import FiltreCacheMenu, FiltreCache
from .logic.filters import refresh_and_reload

logger = logging.getLogger(__name__)

# In-memory cache
_in_memory_cache = {
    "menuData": {},
    "tipSpeta": [],
    "parte": [],
    "materii_map": {},
    "obiecte_map": {},
    "last_updated": None,
    "is_loaded": False,
}

def get_cached_filters():
    """Returns the globally cached filter data."""
    if not _in_memory_cache["is_loaded"]:
        logger.warning("get_cached_filters() called before cache was loaded!")
    return _in_memory_cache

def load_all_filters_into_memory(session: Session):
    """
    This is the main function called at startup. It loads all necessary
    filter data from the database into the in-memory cache.
    """
    logger.info("--- Starting to load all filter data into memory cache ---")

    # 1. Load the main menu (materii/obiecte) from filtre_cache_menu
    logger.info("Step 1: Loading menu data from 'filtre_cache_menu'...")
    menu_row = session.get(FiltreCacheMenu, 1)

    # If the menu doesn't exist in the DB, we must generate it first.
    if not menu_row:
        logger.warning("No pre-calculated menu found in DB. Forcing a full refresh...")
        refresh_and_reload(session)
        # Try loading again after the refresh
        menu_row = session.get(FiltreCacheMenu, 1)

    if menu_row:
        _in_memory_cache["menuData"] = menu_row.menu_data or {}
        _in_memory_cache["materii_map"] = menu_row.materii_map or {}
        _in_memory_cache["obiecte_map"] = menu_row.obiecte_map or {}
        _in_memory_cache["last_updated"] = menu_row.last_updated
        logger.info(f"Successfully loaded menu data with {len(_in_memory_cache['menuData'].get('materii', []))} materii into memory.")
    else:
        logger.error("Failed to load menu data even after a refresh. The menu will be empty.")
        _in_memory_cache["menuData"] = {}
        _in_memory_cache["materii_map"] = {}
        _in_memory_cache["obiecte_map"] = {}


    # 2. Load the simple filters (tipSpeta, parte) from filtre_cache
    logger.info("Step 2: Loading simple filters from 'filtre_cache'...")
    try:
        tip_speta_query = select(FiltreCache.valoare).where(FiltreCache.tip == "tip_speta").order_by(FiltreCache.valoare)
        parte_query = select(FiltreCache.valoare).where(FiltreCache.tip == "parte").order_by(FiltreCache.valoare)

        tip_speta_result = session.exec(tip_speta_query).all()
        parte_result = session.exec(parte_query).all()

        _in_memory_cache["tipSpeta"] = tip_speta_result
        _in_memory_cache["parte"] = parte_result

        logger.info(f"Loaded {len(tip_speta_result)} 'tipSpeta' values into memory.")
        logger.info(f"Loaded {len(parte_result)} 'parte' values into memory.")

    except Exception as e:
        logger.error(f"An error occurred while loading simple filters: {e}", exc_info=True)
        _in_memory_cache["tipSpeta"] = []
        _in_memory_cache["parte"] = []

    _in_memory_cache["is_loaded"] = True
    logger.info("--- In-memory filter cache has been successfully populated ---")
