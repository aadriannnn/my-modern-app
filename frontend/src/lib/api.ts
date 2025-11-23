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
