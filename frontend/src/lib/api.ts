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

export const searchByIdsPaginated = async (
  ids: (number | string)[],
  page: number = 1,
  pageSize: number = 20
) => {
  if (!ids || ids.length === 0) return [];

  const idString = ids.join(',');
  const response = await fetch(
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
  const response = await fetch(`${API_URL}/search/by-ids?ids=${encodeURIComponent(ids)}`, {
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



export const getSettings = async () => {
  const response = await fetch(`${API_URL}/settings/`, {
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error('Failed to fetch settings');
  }
  return response.json();
};

export const updateSettings = async (settings: any) => {
  const response = await fetch(`${API_URL}/settings/`, {
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
  const response = await fetch(`${API_URL}/settings/reset`, {
    method: 'POST',
    credentials: 'include'
  });
  if (!response.ok) {
    throw new Error('Failed to reset settings');
  }
  return response.json();
};

export const loginSettings = async (username: string, pass: string) => {
  const response = await fetch(`${API_URL}/settings/login`, {
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
  const response = await fetch(`${API_URL}/settings/precalculate-models-codes?restart=${restart}`, {
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
  const response = await fetch(`${API_URL}/settings/precalculate-status`, {
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
    credentials: 'include'
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'Failed to stop precalculation');
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
  const response = await fetch(`${API_URL}/feedback`, {
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
  const response = await fetch(`${API_URL}/feedback/stats`, {
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error('Failed to fetch feedback statistics');
  }

  return response.json();
};

// Human-in-the-Loop: Create analysis plan (Phase 1)
export const createAnalysisPlan = async (query: string) => {
  const response = await fetch(`${API_URL}/advanced-analysis/create-plan`, {
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

// Human-in-the-Loop: Execute analysis plan (Phase 2 & 3)
export const executeAnalysisPlan = async (
  planId: string,
  notificationPreferences?: { email: string; terms_accepted: boolean }
) => {
  const response = await fetch(`${API_URL}/advanced-analysis/execute-plan`, {
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
  const response = await fetch(`${API_URL}/advanced-analysis/update-plan-limit/${planId}`, {
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
  const response = await fetch(`${API_URL}/advanced-analysis/status/${jobId}`, {
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
  const response = await fetch(`${API_URL}/advanced-analysis/queue/add`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, user_metadata: userMetadata }),
    credentials: 'include'
  });
  if (!response.ok) throw new Error('Failed to add task');
  return response.json();
};

export const getQueue = async (): Promise<QueueState> => {
  const response = await fetch(`${API_URL}/advanced-analysis/queue`, {
    credentials: 'include'
  });
  if (!response.ok) throw new Error('Failed to fetch queue');
  return response.json();
};

export const removeQueueTask = async (taskId: string) => {
  const response = await fetch(`${API_URL}/advanced-analysis/queue/${taskId}`, {
    method: 'DELETE',
    credentials: 'include'
  });
  if (!response.ok) throw new Error('Failed to remove task');
  return response.json();
};

export const generatePlansBatch = async () => {
  const response = await fetch(`${API_URL}/advanced-analysis/queue/generate-plans`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
    credentials: 'include'
  });
  if (!response.ok) throw new Error('Failed to start batch planning');
  return response.json();
};

export const executeQueue = async (notificationEmail?: string, termsAccepted?: boolean) => {
  const response = await fetch(`${API_URL}/advanced-analysis/queue/execute-all`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notification_email: notificationEmail, terms_accepted: termsAccepted }),
    credentials: 'include'
  });
  if (!response.ok) throw new Error('Failed to start queue execution');
  return response.json();
};

export const getQueueResults = async () => {
  const response = await fetch(`${API_URL}/advanced-analysis/queue/results`, {
    credentials: 'include'
  });
  if (!response.ok) throw new Error('Failed to fetch results');
  return response.json();
};
