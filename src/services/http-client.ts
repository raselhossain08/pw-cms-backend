import { Injectable } from '@nestjs/common';

@Injectable()
export class HttpClient {
  private baseURL =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<{ success: boolean; data?: T; message?: string; error?: string }> {
    const url = `${this.baseURL}${endpoint}`;

    // Get auth token from localStorage (for frontend)
    let token: string | null = null;
    if (typeof window !== 'undefined') {
      token = localStorage.getItem('auth_token');
    }

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || `HTTP error! status: ${response.status}`,
        };
      }

      return {
        success: true,
        data: data.data || data,
        message: data.message,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Network error occurred',
      };
    }
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<any> {
    const queryString = params
      ? `?${new URLSearchParams(params).toString()}`
      : '';
    return this.request<T>(`${endpoint}${queryString}`);
  }

  async post<T>(endpoint: string, data?: any): Promise<any> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<any> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async patch<T>(endpoint: string, data?: any): Promise<any> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<any> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }
}
