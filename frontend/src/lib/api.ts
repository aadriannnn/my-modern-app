interface SearchParams {
  situatie: string;
  materie: string[];
  obiect: string[];
  tip_speta: string[];
  parte: string[];
  offset?: number;
}

const API_URL = '/api';

import type { Filters } from '../types';

export const getFilters = async (): Promise<Filters> => {
  try {
    const response = await fetch(`${API_URL}/filters/menu`, {
      credentials: 'include'
    });
    if (!response.ok) {
      throw new Error('Failed to fetch filters');
    }
    const data = await response.json();

    // Asigură fallback-uri sigure pentru fiecare câmp
    return {
      materii: data.menuData?.materii ?? [],
      obiecte: data.menuData?.obiecte ?? [],
      details: data.menuData?.details ?? {},
      tipSpeta: data.tipSpeta ?? [],
      parte: data.parte ?? [],
    };
  } catch (error) {
    console.error("Error in getFilters:", error);
    // Returnează o structură goală validă în caz de eroare
    return {
      materii: [],
      obiecte: [],
      details: {},
      tipSpeta: [],
      parte: [],
    };
  }
};

export class ApiError extends Error {
  public readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    // Set the prototype explicitly.
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export const search = async (payload: SearchParams) => {
  const response = await fetch(`${API_URL}/search/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include'
  });

  if (!response.ok) {
    let detail = `Request failed with status ${response.status}`;
    try {
      const errorData = await response.json();
      detail = errorData.detail || detail;
    } catch (e) {
      // The response body was not JSON. The default detail is fine.
    }
    throw new ApiError(detail, response.status);
  }

  return response.json();
};

export const refreshFilters = async () => {
  const response = await fetch(`${API_URL}/filters/refresh`, {
    method: 'POST',
    credentials: 'include'
  });
  if (!response.ok) {
    throw new Error('Filter refresh failed');
  }
  return response.json();
};

export const contribute = async (data: { denumire: string; sursa: string }) => {
  const response = await fetch(`${API_URL}/contribuie/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include'
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'Contribuie failed');
  }
  return response.json();
};

export const login = async (username: string, password: string): Promise<{ success: boolean }> => {
  console.log('[LOGIN] Starting login process');
  console.log('[LOGIN] Username:', username);
  console.log('[LOGIN] Password length:', password.length);
  console.log('[LOGIN] API URL:', `${API_URL}/auth/login`);

  try {
    const requestBody = { username, password };
    console.log('[LOGIN] Request body:', { username, password: '***' });

    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      credentials: 'include'
    });

    console.log('[LOGIN] Response status:', response.status);
    console.log('[LOGIN] Response ok:', response.ok);
    console.log('[LOGIN] Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[LOGIN] Error response data:', errorData);
      throw new Error(errorData.detail || 'Autentificare eșuată');
    }

    const data = await response.json();
    console.log('[LOGIN] Success response data:', data);

    // Check if session cookie was set
    const cookies = document.cookie;
    console.log('[LOGIN] Cookies after login:', cookies);

    return data;
  } catch (error) {
    console.error('[LOGIN] Exception caught:', error);
    if (error instanceof Error) {
      console.error('[LOGIN] Error message:', error.message);
      console.error('[LOGIN] Error stack:', error.stack);
    }
    throw error;
  }
};

// Store credentials after successful login for use in API calls
let storedCredentials: { username: string; password: string } | null = null;

// Helper to get Authorization header
const getAuthHeader = (): string => {
  if (storedCredentials) {
    return 'Basic ' + btoa(`${storedCredentials.username}:${storedCredentials.password}`);
  }
  // Fallback to build-time credentials if available
  return 'Basic ' + btoa(`${__AUTH_USER__}:${__AUTH_PASS__}`);
};

export const getSettings = async () => {
  console.log('[API] Getting settings, has stored credentials:', !!storedCredentials);

  const response = await fetch(`${API_URL}/settings/`, {
    headers: {
      'Authorization': getAuthHeader()
    },
    credentials: 'include'
  });

  console.log('[API] Settings response status:', response.status);

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('401: Unauthorized - credentials invalid or missing');
    }
    throw new Error('Failed to fetch settings');
  }
  return response.json();
};

export const updateSettings = async (settings: any) => {
  const response = await fetch(`${API_URL}/settings/`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': getAuthHeader()
    },
    body: JSON.stringify(settings),
    credentials: 'include'
  });
  if (!response.ok) {
    throw new Error('Failed to update settings');
  }
  return response.json();
};

export const resetSettings = async () => {
  const response = await fetch(`${API_URL}/settings/reset`, {
    method: 'POST',
    headers: {
      'Authorization': getAuthHeader()
    },
    credentials: 'include'
  });
  if (!response.ok) {
    throw new Error('Failed to reset settings');
  }
  return response.json();
};

export const precalculateModelsCodes = async (restart: boolean = false) => {
  const response = await fetch(`${API_URL}/settings/precalculate-models-codes?restart=${restart}`, {
    method: 'POST',
    headers: {
      'Authorization': getAuthHeader()
    },
    credentials: 'include'
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'Failed to precalculate models and codes');
  }
  return response.json();
};

export const getPrecalculateStatus = async () => {
  const response = await fetch(`${API_URL}/settings/precalculate-status`, {
    headers: {
      'Authorization': getAuthHeader()
    },
    credentials: 'include'
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'Failed to get precalculate status');
  }
  return response.json();
};

export const stopPrecalculate = async () => {
  const response = await fetch(`${API_URL}/settings/precalculate-stop`, {
    method: 'POST',
    headers: {
      'Authorization': getAuthHeader()
    },
    credentials: 'include'
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'Failed to stop precalculation');
  }
  return response.json();
};

// Export function to store credentials after login
export const setAuthCredentials = (username: string, password: string) => {
  console.log('[API] Storing credentials for user:', username);
  storedCredentials = { username, password };

  // Also store in sessionStorage for page refresh persistence
  sessionStorage.setItem('auth_credentials', btoa(JSON.stringify({ username, password })));
};

// Export function to clear credentials on logout
export const clearAuthCredentials = () => {
  console.log('[API] Clearing stored credentials');
  storedCredentials = null;
  sessionStorage.removeItem('auth_credentials');
};

// Load credentials from sessionStorage on module load
const loadStoredCredentials = () => {
  try {
    const stored = sessionStorage.getItem('auth_credentials');
    if (stored) {
      storedCredentials = JSON.parse(atob(stored));
      console.log('[API] Loaded credentials from session storage for user:', storedCredentials?.username);
    }
  } catch (err) {
    console.error('[API] Failed to load stored credentials:', err);
    sessionStorage.removeItem('auth_credentials');
  }
};

// Auto-load credentials on module initialization
loadStoredCredentials();
