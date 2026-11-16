import axios from 'axios';

export const apiClient = axios.create({
  baseURL: '/api/v1',
  withCredentials: true, // Secure HttpOnly cookies transmission
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper to retrieve CSRF token from non-HttpOnly cookie
function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
}

// Interceptor to attach X-CSRF-Token for mutative requests
apiClient.interceptors.request.use((config) => {
  if (config.method && !['get', 'head', 'options'].includes(config.method.toLowerCase())) {
    const csrfToken = getCookie('ns_csrf_token');
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
  }
  return config;
});

// Interceptor to handle session expiration gracefully
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

