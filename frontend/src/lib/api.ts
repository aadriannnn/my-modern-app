interface SearchParams {
  situatie: string;
  materie: string[];
  obiect: string[];
  tip_speta: string[];
  parte: string[];
  offset?: number;
}

const API_URL = '/api';

export const getFilters = async () => {
  const response = await fetch(`${API_URL}/filters/menu`);
  if (!response.ok) {
    throw new Error('Failed to fetch filters');
  }
  const data = await response.json();
  return {
    tipSpeta: data.tipSpeta || [],
    parte: data.parte || [],
    menuData: data.menuData || [],
  };
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
  const response = await fetch(`${API_URL}/filters/refresh`, { method: 'POST' });
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
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Contribuie failed');
    }
    return response.json();
};
