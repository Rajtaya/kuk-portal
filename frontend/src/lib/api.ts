const API_BASE = '/api';

class ApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    // X-Requested-With is the first-party CSRF marker the backend requires on
    // cookie-authenticated, state-changing requests (cross-site forms can't set it).
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      ...options.headers as any,
    };

    const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers, credentials: 'include' });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Request failed' }));
      if (res.status === 401 && typeof window !== 'undefined' && !endpoint.startsWith('/auth/')) {
        window.location.href = '/login';
      }
      throw new Error(err.message || `HTTP ${res.status}`);
    }

    return res.json();
  }

  get<T>(endpoint: string) { return this.request<T>(endpoint); }

  post<T>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
  }

  put<T>(endpoint: string, body: any) {
    return this.request<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) });
  }

  patch<T>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined });
  }

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async uploadFile<T>(endpoint: string, file: File, params?: Record<string, string>, fieldName = 'file') {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    const formData = new FormData();
    formData.append(fieldName, file);

    const res = await fetch(`${API_BASE}${endpoint}${query}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
      body: formData,
    });

    if (!res.ok) throw new Error('Upload failed');
    return res.json() as Promise<T>;
  }
}

export const api = new ApiClient();
