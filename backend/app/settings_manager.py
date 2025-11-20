import json
import os
import logging
from typing import Dict, Any
from pathlib import Path

logger = logging.getLogger(__name__)

# Paths
BASE_DIR = Path(__file__).resolve().parent
DEFAULT_SETTINGS_PATH = BASE_DIR.parent / "setari_default.json"
USER_SETTINGS_PATH = BASE_DIR.parent / "setari.json"

class SettingsManager:
    _instance = None
    _settings_cache: Dict[str, Any] = {}

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(SettingsManager, cls).__new__(cls)
            cls._instance._load_settings()
        return cls._instance

    def _load_settings(self):
        """
        Loads settings from setari.json if it exists, otherwise from setari_default.json.
        Merges user settings on top of defaults to ensure new defaults are picked up.
        """
        defaults = self._load_json(DEFAULT_SETTINGS_PATH)
        user_settings = self._load_json(USER_SETTINGS_PATH)

        # Start with defaults
        self._settings_cache = defaults.copy()

        # Recursively update with user settings
        self._deep_update(self._settings_cache, user_settings)

        logger.info("Settings loaded successfully.")

    def _load_json(self, path: Path) -> Dict[str, Any]:
        if not path.exists():
            return {}
        try:
            with open(path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error loading settings from {path}: {e}")
            return {}

    def _deep_update(self, base_dict: Dict, update_dict: Dict):
        for key, value in update_dict.items():
            if isinstance(value, dict) and key in base_dict and isinstance(base_dict[key], dict):
                self._deep_update(base_dict[key], value)
            else:
                base_dict[key] = value

    def get_settings(self) -> Dict[str, Any]:
        """Returns the current settings dictionary."""
        if not self._settings_cache:
            self._load_settings()
        return self._settings_cache

    def get_value(self, section: str, key: str, default: Any = None) -> Any:
        """
        Helper to get a specific value.
        Structure is usually section -> key -> value.
        """
        section_data = self._settings_cache.get(section, {})
        item_data = section_data.get(key, {})
        if isinstance(item_data, dict) and "value" in item_data:
            return item_data["value"]
        return default

    def save_settings(self, new_settings: Dict[str, Any]):
        """
        Saves the provided settings to setari.json.
        """
        try:
            # We only save what's different or just save the whole structure?
            # Saving the whole structure is safer for now.
            with open(USER_SETTINGS_PATH, 'w', encoding='utf-8') as f:
                json.dump(new_settings, f, indent=2, ensure_ascii=False)

            # Update cache
            self._settings_cache = new_settings
            logger.info("Settings saved to setari.json")
        except Exception as e:
            logger.error(f"Error saving settings: {e}")
            raise

    def reset_to_defaults(self):
        """Resets setari.json to match setari_default.json"""
        defaults = self._load_json(DEFAULT_SETTINGS_PATH)
        self.save_settings(defaults)

# Global instance
settings_manager = SettingsManager()
