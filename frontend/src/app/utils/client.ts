const BASE_URL = "http://127.0.0.1:8000/api";

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: any;
  headers?: Record<string, string>;
};

export async function apiFetch<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method || "GET";
  const url = `${BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  // Build headers
  const headers: Record<string, string> = {
    ...options.headers,
  };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  // Get token from localStorage
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const config: RequestInit = {
    method,
    headers,
  };

  if (options.body) {
    config.body = options.body instanceof FormData ? options.body : JSON.stringify(options.body);
  }

  try {
    const response = await fetch(url, config);

    // If 204 No Content, return null/undefined
    if (response.status === 204) {
      return null as unknown as T;
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      // Extract FastAPI detail error
      const errorMessage = data.detail || "Something went wrong. Please try again.";
      throw new Error(typeof errorMessage === "string" ? errorMessage : JSON.stringify(errorMessage));
    }

    return data as T;
  } catch (error: any) {
    console.error(`API Fetch Error [${method} ${endpoint}]:`, error);
    throw error;
  }
}
