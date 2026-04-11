import axios from 'axios';

interface RefreshResponse {
  ticket: string;
  csrf_token: string;
}

const api = axios.create({
  baseURL: 'http://localhost:8000',
});

// Request interceptor: inject auth params from localStorage
api.interceptors.request.use((config) => {
  const ticket = localStorage.getItem('ticket');
  const csrf_token = localStorage.getItem('csrf_token');
  if (ticket && csrf_token) {
    config.params = { ...(config.params as Record<string, unknown>), ticket, csrf_token };
  }
  return config;
});

// Deduplication: only one refresh at a time
let refreshPromise: Promise<RefreshResponse | null> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Skip interceptor for auth endpoints to avoid loops
    if (
      !error.response ||
      error.response.status !== 401 ||
      originalRequest._retry ||
      originalRequest.url === '/login' ||
      originalRequest.url === '/auth/refresh'
    ) {
      return Promise.reject(error);
    }

    // Try to refresh the ticket via admin proxy credentials
    originalRequest._retry = true;

    if (!refreshPromise) {
      refreshPromise = (async (): Promise<RefreshResponse | null> => {
        try {
          const { data } = await axios.post<RefreshResponse>('http://localhost:8000/auth/refresh');
          localStorage.setItem('ticket', data.ticket);
          localStorage.setItem('csrf_token', data.csrf_token);
          window.dispatchEvent(
            new CustomEvent('auth:refreshed', {
              detail: { ticket: data.ticket, csrf_token: data.csrf_token },
            }),
          );
          return data;
        } catch {
          window.dispatchEvent(new CustomEvent('auth:logout'));
          return null;
        } finally {
          refreshPromise = null;
        }
      })();
    }

    const refreshed = await refreshPromise!;
    if (!refreshed) return Promise.reject(error);

    // Retry original request with fresh credentials
    originalRequest.params = {
      ...originalRequest.params,
      ticket: refreshed.ticket,
      csrf_token: refreshed.csrf_token,
    };
    return api(originalRequest);
  },
);

export default api;
