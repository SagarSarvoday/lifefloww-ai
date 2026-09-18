import {
  ActivityExtraction,
  ActivityListResponse,
  ActivityParseResponse,
  ActivitySingleResponse,
  ActivityUpdatePayload,
  HealthResponse,
} from "@/types/activity";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000/api/v1";

export class ApiError extends Error {
  statusCode: number;
  data?: unknown;

  constructor(message: string, statusCode: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.data = data;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      cache: "no-store", // Ensure real-time state for activities
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      let errorMessage = "An unexpected error occurred";
      if (data) {
        if (typeof data.detail === "string") {
          errorMessage = data.detail;
        } else if (Array.isArray(data.detail)) {
          errorMessage = data.detail.map((d: { msg?: string }) => d.msg || "").join(", ");
        } else if (data.error) {
          errorMessage = data.error;
        }
      }
      throw new ApiError(errorMessage, response.status, data);
    }

    return data as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : "Failed to connect to backend server",
      0
    );
  }
}

export const api = {
  async getHealth(): Promise<HealthResponse> {
    return request<HealthResponse>("/health");
  },

  async parseActivity(text: string): Promise<ActivityParseResponse> {
    return request<ActivityParseResponse>("/activities/parse", {
      method: "POST",
      body: JSON.stringify({ text }),
    });
  },

  async createActivity(text: string): Promise<ActivitySingleResponse> {
    return request<ActivitySingleResponse>("/activities", {
      method: "POST",
      body: JSON.stringify({ text }),
    });
  },

  async getActivities(params?: {
    status?: string;
    category?: string;
    limit?: number;
    offset?: number;
    sort_by?: string;
    sort_order?: string;
  }): Promise<ActivityListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append("status", params.status);
    if (params?.category) searchParams.append("category", params.category);
    if (params?.limit !== undefined) searchParams.append("limit", params.limit.toString());
    if (params?.offset !== undefined) searchParams.append("offset", params.offset.toString());
    if (params?.sort_by) searchParams.append("sort_by", params.sort_by);
    if (params?.sort_order) searchParams.append("sort_order", params.sort_order);

    const query = searchParams.toString();
    return request<ActivityListResponse>(`/activities${query ? `?${query}` : ""}`);
  },

  async getTodayActivities(): Promise<ActivityListResponse> {
    return request<ActivityListResponse>("/activities/today");
  },

  async getActivityById(id: string): Promise<ActivitySingleResponse> {
    return request<ActivitySingleResponse>(`/activities/${id}`);
  },

  async updateActivity(
    id: string,
    updates: ActivityUpdatePayload
  ): Promise<ActivitySingleResponse> {
    return request<ActivitySingleResponse>(`/activities/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
  },

  async deleteActivity(id: string): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>(`/activities/${id}`, {
      method: "DELETE",
    });
  },
};
