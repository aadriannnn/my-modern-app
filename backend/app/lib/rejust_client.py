"""
SOAP Client for Romanian Court Portal (portalquery.just.ro)

This module provides integration with the Romanian Court Portal's SOAP web service
to fetch court file data by case number.
"""

import logging
from typing import Optional, Dict, Any
from zeep import Client, Settings
from zeep.exceptions import Fault, TransportError
from zeep.transports import Transport
from requests import Session

logger = logging.getLogger(__name__)

# SOAP service endpoint
PORTAL_WSDL_URL = "http://portalquery.just.ro/query.asmx?WSDL"

class ReJustClient:
    """Client for interacting with the Romanian Court Portal SOAP service."""

    def __init__(self, timeout: int = 30):
        """
        Initialize the SOAP client.

        Args:
            timeout: Timeout in seconds for SOAP requests
        """
        self.timeout = timeout
        self.client = None
        self._initialize_client()

    def _initialize_client(self):
        """Initialize the SOAP client with proper settings."""
        try:
            # Configure transport with timeout
            session = Session()
            session.timeout = self.timeout
            transport = Transport(session=session)

            # Configure settings
            settings = Settings(strict=False, xml_huge_tree=True)

            # Create SOAP client
            self.client = Client(
                wsdl=PORTAL_WSDL_URL,
                settings=settings,
                transport=transport
            )
            logger.info("SOAP client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize SOAP client: {e}")
            raise

    def fetch_case_by_number(
        self,
        numar_dosar: str,
        institutie: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Fetch case data from the court portal by case number.

        Args:
            numar_dosar: The court file number to search for
            institutie: Optional institution/court name

        Returns:
            Dictionary containing:
                - success: bool indicating if the call was successful
                - obiect: str the case object/description from the portal
                - numar: str the case number
                - error: Optional str with error message if failed

        Raises:
            ValueError: If numar_dosar is empty or invalid
        """
        if not numar_dosar or len(numar_dosar.strip()) < 3:
            raise ValueError("Numărul dosarului trebuie să aibă minim 3 caractere")

        try:
            logger.info(f"Fetching case data for: {numar_dosar}")

            # Call the CautareDosare SOAP method
            # Parameters: numarDosar, obiectDosar, numeParte, institutie, dataStart, dataStop
            response = self.client.service.CautareDosare(
                numarDosar=numar_dosar.strip(),
                obiectDosar=None,
                numeParte=None,
                institutie=institutie,
                dataStart=None,
                dataStop=None
            )

            # Check if we got results
            if response is None or len(response) == 0:
                logger.warning(f"No results found for case number: {numar_dosar}")
                return {
                    "success": False,
                    "obiect": None,
                    "numar": numar_dosar,
                    "error": "Nu au fost găsite dosare cu acest număr"
                }

            # Get the first result (most relevant)
            dosar = response[0]

            # Extract the obiect field
            obiect = getattr(dosar, 'obiect', None)

            if not obiect:
                logger.warning(f"Case found but no obiect field: {numar_dosar}")
                return {
                    "success": False,
                    "obiect": None,
                    "numar": numar_dosar,
                    "error": "Dosarul a fost găsit dar nu conține câmpul 'obiect'"
                }

            logger.info(f"Successfully fetched case data. Obiect: {obiect[:50]}...")

            return {
                "success": True,
                "obiect": obiect,
                "numar": getattr(dosar, 'numar', numar_dosar),
                "categorie_caz": str(getattr(dosar, 'categorieCaz', '')),
                "stadiu_procesual": str(getattr(dosar, 'stadiuProcesual', '')),
                "error": None
            }

        except Fault as e:
            error_msg = f"SOAP fault: {e.message}"
            logger.error(error_msg)
            return {
                "success": False,
                "obiect": None,
                "numar": numar_dosar,
                "error": f"Eroare la apelarea serviciului portal: {e.message}"
            }

        except TransportError as e:
            error_msg = f"Transport error: {e}"
            logger.error(error_msg)
            return {
                "success": False,
                "obiect": None,
                "numar": numar_dosar,
                "error": "Eroare de conectare la portalul instanței. Vă rugăm încercați mai târziu."
            }

        except Exception as e:
            error_msg = f"Unexpected error fetching case: {e}"
            logger.error(error_msg, exc_info=True)
            return {
                "success": False,
                "obiect": None,
                "numar": numar_dosar,
                "error": f"Eroare neașteptată: {str(e)}"
            }


# Singleton instance
_client_instance: Optional[ReJustClient] = None

def get_rejust_client() -> ReJustClient:
    """
    Get or create the singleton SOAP client instance.

    Returns:
        ReJustClient instance
    """
    global _client_instance
    if _client_instance is None:
        _client_instance = ReJustClient()
    return _client_instance
