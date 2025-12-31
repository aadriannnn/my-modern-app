import type { Filters, QueueState } from '../types';

interface SearchParams {
  situatie: string;
  materie: string[];
  obiect: string[];
  tip_speta: string[];
  parte: string[];
  offset?: number;
}

const API_URL = '/api';

// Timeout configuration: 3 minutes (180 seconds) for slow LLM responses
const API_TIMEOUT_MS = 180000; // 3 minutes

/**
 * Fetch with timeout support.
 * Wraps the standard fetch API with an AbortController to enforce a timeout.
 *
 * @param url - The URL to fetch
 * @param options - Fetch options (headers, method, body, etc.)
 * @param timeout - Timeout in milliseconds (default: 3 minutes)
 * @returns Promise that resolves to the Response
 */
const fetchWithTimeout = async (
  url: string,
  options: RequestInit = {},
  timeout: number = API_TIMEOUT_MS
): Promise<Response> => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error: any) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout / 1000} seconds`);
    }
    throw error;
  }
};

export const getFilters = async (): Promise<Filters> => {
  try {
    const response = await fetchWithTimeout(`${API_URL}/filters/menu`, {
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

export const getFilterMappings = async () => {
  try {
    const response = await fetchWithTimeout(`${API_URL}/search/filters/mappings`, {
      credentials: 'include'
    });
    if (!response.ok) {
      console.warn('Failed to fetch filter mappings');
      return { materii_map: {}, obiecte_map: {} };
    }
    return response.json();
  } catch (error) {
    console.error("Error fetching filter mappings:", error);
    return { materii_map: {}, obiecte_map: {} };
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
  const response = await fetchWithTimeout(`${API_URL}/search/`, {
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

export const searchByIdsPaginated = async (
  ids: (number | string)[],
  page: number = 1,
  pageSize: number = 20
) => {
  if (!ids || ids.length === 0) return [];

  const idString = ids.join(',');
  const response = await fetchWithTimeout(
    `${API_URL}/search/by-ids?ids=${encodeURIComponent(idString)}&page=${page}&page_size=${pageSize}`,
    {
      method: 'GET',
      credentials: 'include'
    }
  );

  if (!response.ok) {
    let detail = `Request failed with status ${response.status}`;
    try {
      const errorData = await response.json();
      detail = errorData.detail || detail;
    } catch (e) {
      // The response body was not JSON
    }
    throw new ApiError(detail, response.status);
  }

  return response.json();
};

export const searchByIds = async (ids: string) => {
  const response = await fetchWithTimeout(`${API_URL}/search/by-ids?ids=${encodeURIComponent(ids)}`, {
    method: 'GET',
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
  const response = await fetchWithTimeout(`${API_URL}/filters/refresh`, {
    method: 'POST',
    credentials: 'include'
  });
  if (!response.ok) {
    throw new Error('Filter refresh failed');
  }
  return response.json();
};

export const contribute = async (data: { denumire: string; sursa: string }) => {
  const response = await fetchWithTimeout(`${API_URL}/contribuie/`, {
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



export const getSettings = async () => {
  const response = await fetchWithTimeout(`${API_URL}/settings/`, {
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error('Failed to fetch settings');
  }
  return response.json();
};

export const updateSettings = async (settings: any) => {
  const response = await fetchWithTimeout(`${API_URL}/settings/`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
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
  const response = await fetchWithTimeout(`${API_URL}/settings/reset`, {
    method: 'POST',
    credentials: 'include'
  });
  if (!response.ok) {
    throw new Error('Failed to reset settings');
  }
  return response.json();
};

export const loginSettings = async (username: string, pass: string) => {
  const response = await fetchWithTimeout(`${API_URL}/settings/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username, password: pass }),
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error('Invalid credentials');
  }
  return response.json();
};

export const precalculateModelsCodes = async (restart: boolean = false) => {
  const response = await fetchWithTimeout(`${API_URL}/settings/precalculate-models-codes?restart=${restart}`, {
    method: 'POST',
    credentials: 'include'
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'Failed to precalculate models and codes');
  }
  return response.json();
};

export const getPrecalculateStatus = async () => {
  const response = await fetchWithTimeout(`${API_URL}/settings/precalculate-status`, {
    credentials: 'include'
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'Failed to get precalculate status');
  }
  return response.json();
};

export const stopPrecalculate = async () => {
  const response = await fetchWithTimeout(`${API_URL}/settings/precalculate-stop`, {
    method: 'POST',
    credentials: 'include'
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'Failed to stop precalculation');
  }
  return response.json();
};

export const precalculateTax = async (restart: boolean = false) => {
  const response = await fetchWithTimeout(`${API_URL}/settings/precalculate-tax?restart=${restart}`, {
    method: 'POST',
    credentials: 'include'
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'Failed to precalculate tax');
  }
  return response.json();
};

export const getPrecalculateTaxStatus = async () => {
  const response = await fetchWithTimeout(`${API_URL}/settings/precalculate-tax-status`, {
    credentials: 'include'
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'Failed to get tax precalculate status');
  }
  return response.json();
};

export const stopPrecalculateTax = async () => {
  const response = await fetchWithTimeout(`${API_URL}/settings/precalculate-tax-stop`, {
    method: 'POST',
    credentials: 'include'
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'Failed to stop tax precalculation');
  }
  return response.json();
};

// Queue status subscription using Server-Sent Events
export const subscribeToQueueStatus = (
  requestId: string,
  onUpdate: (status: { position: number; total: number; status: string }) => void,
  onComplete: () => void,
  onError: (error: Error) => void
) => {
  const eventSource = new EventSource(`${API_URL}/queue/status/${requestId}`); // Fixed: Correct SSE endpoint

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);

      if (data.status === 'completed' || data.status === 'error') {
        eventSource.close();
        // Pass final data (which might contain result or error details)
        // to onUpdate before completing.
        onUpdate(data);
        onComplete();
      } else {
        onUpdate(data);
      }
    } catch (e) {
      console.error('Error parsing SSE data:', e);
    }
  };

  eventSource.onerror = () => {
    // console.error('SSE error:', error);
    // Commented out to reduce noise, as browsers often fire error on close
    eventSource.close();
    // Only call onError if it wasn't a clean close
    // onError(new Error('Connection to server lost'));
    onError(new Error('Connection lost'));
  };

  return {
    close: () => eventSource.close()
  };
};

// Feedback API interfaces
export interface FeedbackStats {
  total_feedback: number;
  good_count: number;
  bad_count: number;
  good_percentage: number;
  bad_percentage: number;
}

/**
 * Submit user feedback (good or bad rating)
 */
export const submitFeedback = async (
  feedbackType: 'good' | 'bad',
  spetaId?: number
): Promise<{ success: boolean; message: string }> => {
  const response = await fetchWithTimeout(`${API_URL}/feedback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      feedback_type: feedbackType,
      speta_id: spetaId
    }),
    credentials: 'include'
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to submit feedback');
  }

  return response.json();
};

/**
 * Get feedback statistics
 */
export const getFeedbackStats = async (): Promise<FeedbackStats> => {
  const response = await fetchWithTimeout(`${API_URL}/feedback/stats`, {
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error('Failed to fetch feedback statistics');
  }

  return response.json();
};

// Human-in-the-Loop: Create analysis plan (Phase 1)
export const createAnalysisPlan = async (query: string) => {
  const response = await fetchWithTimeout(`${API_URL}/advanced-analysis/create-plan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query }),
    credentials: 'include'
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to create analysis plan');
  }
  return response.json();
};

// Task Breakdown: Decompose a complex query into multiple sub-tasks (Phase 0)
export const decomposeTask = async (query: string) => {
  const response = await fetchWithTimeout(`${API_URL}/advanced-analysis/decompose-task`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query }),
    credentials: 'include'
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to decompose task');
  }
  return response.json();
};

// Human-in-the-Loop: Execute analysis plan (Phase 2 & 3)
export const executeAnalysisPlan = async (
  planId: string,
  notificationPreferences?: { email: string; terms_accepted: boolean }
) => {
  const response = await fetchWithTimeout(`${API_URL}/advanced-analysis/execute-plan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      plan_id: planId,
      notification_email: notificationPreferences?.email,
      terms_accepted: notificationPreferences?.terms_accepted
    }),
    credentials: 'include'
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to execute analysis plan');
  }
  return response.json();
};

// Human-in-the-Loop: Update plan case limit
export const updateAnalysisPlan = async (planId: string, maxCases: number) => {
  const response = await fetchWithTimeout(`${API_URL}/advanced-analysis/update-plan-limit/${planId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ max_cases: maxCases }),
    credentials: 'include'
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to update analysis plan');
  }
  return response.json();
};


export const getAdvancedAnalysisStatus = async (jobId: string) => {
  const response = await fetchWithTimeout(`${API_URL}/advanced-analysis/status/${jobId}`, {
    credentials: 'include'
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to get analysis status');
  }

  return response.json();
};

// --- Queue Management API ---

export const addQueueTask = async (query: string, userMetadata?: any) => {
  const response = await fetchWithTimeout(`${API_URL}/advanced-analysis/queue/add`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, user_metadata: userMetadata }),
    credentials: 'include'
  });
  if (!response.ok) throw new Error('Failed to add task');
  return response.json();
};

export const getQueue = async (): Promise<QueueState> => {
  const response = await fetchWithTimeout(`${API_URL}/advanced-analysis/queue`, {
    credentials: 'include'
  });
  if (!response.ok) throw new Error('Failed to fetch queue');
  return response.json();
};

export const removeQueueTask = async (taskId: string) => {
  const response = await fetchWithTimeout(`${API_URL}/advanced-analysis/queue/${taskId}`, {
    method: 'DELETE',
    credentials: 'include'
  });
  if (!response.ok) throw new Error('Failed to remove task');
  return response.json();
};

export const generatePlansBatch = async () => {
  const response = await fetchWithTimeout(`${API_URL}/advanced-analysis/queue/generate-plans`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
    credentials: 'include'
  });
  if (!response.ok) throw new Error('Failed to start batch planning');
  return response.json();
};

export const executeQueue = async (notificationEmail?: string, termsAccepted?: boolean) => {
  const response = await fetchWithTimeout(`${API_URL}/advanced-analysis/queue/execute-all`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notification_email: notificationEmail, terms_accepted: termsAccepted }),
    credentials: 'include'
  });
  if (!response.ok) throw new Error('Failed to start queue execution');
  return response.json();
};

export const clearCompletedQueue = async () => {
  const response = await fetchWithTimeout(`${API_URL}/advanced-analysis/queue/completed`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to clear completed tasks');
  return response.json();
};

export const clearAnalysisSession = async (jobId: string) => {
  const response = await fetchWithTimeout(`${API_URL}/advanced-analysis/session/${jobId}`, {
    method: 'DELETE',
  });
  // Don't throw if 404, just ignore
  return response.json().catch(() => ({}));
};

export const getQueueResults = async () => {
  const response = await fetchWithTimeout(`${API_URL}/advanced-analysis/queue/results`, {
    credentials: 'include'
  });
  if (!response.ok) throw new Error('Failed to fetch results');
  return response.json();
};

// --- Final Report API (Phase 4) ---

export const startFullAcademicCycle = async (query: string, notificationEmail?: string, termsAccepted?: boolean) => {
  const response = await fetchWithTimeout(`${API_URL}/advanced-analysis/full-academic-cycle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, notification_email: notificationEmail, terms_accepted: termsAccepted }),
    credentials: 'include'
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to start full academic cycle');
  }
  return response.json();
};

export const generateFinalReport = async () => {
  const response = await fetchWithTimeout(`${API_URL}/advanced-analysis/queue/generate-final-report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include'
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail?.message || errorData.detail || 'Failed to generate final report');
  }

  return response.json();
};

export const getFinalReport = async (reportId: string) => {
  const response = await fetchWithTimeout(`${API_URL}/advanced-analysis/queue/final-report/${reportId}`, {
    credentials: 'include'
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to fetch final report');
  }

  return response.json();
};

export const downloadFinalReportDocx = async (reportId: string) => {
  let url = `${API_URL}/advanced-analysis/queue/final-report/${reportId}/export`;

  if (reportId === 'SIMULATION' || reportId === 'SIMULATION_MODE') {
    url = `${API_URL}/dev/simulate-docx`;
  }

  const response = await fetchWithTimeout(url, {
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error('Failed to download report');
  }

  const blob = await response.blob();
  const urlObj = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = urlObj;
  // If simulation, use a specific filename, otherwise use reportID
  a.download = reportId === 'SIMULATION' || reportId === 'SIMULATION_MODE'
    ? 'referat_simulat_dev.docx'
    : `referat_final_${reportId}.docx`;

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(urlObj);
};

export const simulateReport = async () => {
  const response = await fetchWithTimeout(`${API_URL}/dev/simulate-report`, {
    method: 'POST',
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error('Failed to simulate report');
  }

  return response.json();
};

// Dosar Search API
export const searchByDosar = async (numarDosar: string) => {
  const response = await fetchWithTimeout(`${API_URL}/search-by-dosar`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ numar_dosar: numarDosar }),
    credentials: 'include'
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to search by dosar number');
  }

  return response.json();
};

// User Management API
export const getUsers = async (page = 1, limit = 20, search = '') => {
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  if (search) {
    queryParams.append('search', search);
  }

  const response = await fetchWithTimeout(`${API_URL}/auth/users?${queryParams.toString()}`, {
    method: 'GET',
    credentials: 'include'
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to fetch users');
  }

  return response.json();
};

export const updateUserRole = async (userId: string, role: string) => {
  const response = await fetchWithTimeout(`${API_URL}/auth/users/${userId}/role`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ rol: role }),
    credentials: 'include'
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to update user role');
  }

  return response.json();
};

// Index Maintenance API
export const getIndexStatus = async () => {
  const response = await fetchWithTimeout(`${API_URL}/settings/index-status`, {
    credentials: 'include'
  });
  if (!response.ok) {
    throw new Error('Failed to get index status');
  }
  return response.json();
};

export const startIndexRepair = async () => {
  const response = await fetchWithTimeout(`${API_URL}/settings/index-repair`, {
    method: 'POST',
    credentials: 'include'
  });
  if (!response.ok) {
    throw new Error('Failed to start index repair');
  }
  return response.json();
};

export const stopIndexRepair = async () => {
  const response = await fetchWithTimeout(`${API_URL}/settings/index-repair/stop`, {
    method: 'POST',
    credentials: 'include'
  });
  if (!response.ok) {
    throw new Error('Failed to stop index repair');
  }
  return response.json();
};

// Dosar Persistence API
export const getDosarItems = async () => {
  const response = await fetchWithTimeout(`${API_URL}/dosar/`, {
    method: 'GET',
    credentials: 'include'
  });
  if (!response.ok) throw new Error('Failed to fetch dosar items');
  return response.json();
};

export const addDosarItem = async (item: any) => {
  const response = await fetchWithTimeout(`${API_URL}/dosar/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
    credentials: 'include'
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to add item to dosar');
  }
  return response.json();
};

export const removeDosarItem = async (caseId: string | number) => {
  const response = await fetchWithTimeout(`${API_URL}/dosar/${caseId}`, {
    method: 'DELETE',
    credentials: 'include'
  });
  if (!response.ok) throw new Error('Failed to remove item from dosar');
  return response.json();
};
