export const API_BASE_URL = import.meta.env.VITE_API_URL || '';

// Retrieve or generate anonymous user ID for session isolation
const getUserId = (): string => {
  let userId = localStorage.getItem('mindfulflow_user_id');
  if (!userId) {
    userId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('mindfulflow_user_id', userId);
  }
  return userId;
};

export const apiFetch = async (endpoint: string, options: RequestInit = {}): Promise<Response> => {
  const headers = new Headers(options.headers || {});
  
  // Set the multi-user isolation header
  headers.set('X-User-Id', getUserId());
  
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  
  return fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers
  });
};
