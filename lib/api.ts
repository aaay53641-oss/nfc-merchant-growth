import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// API endpoints
export const endpoints = {
  // Auth
  login: "/auth/login",
  logout: "/auth/logout",
  register: "/auth/register",

  // Campaign
  campaigns: "/campaigns",
  campaign: (id: string) => `/campaigns/${id}`,

  // Tasks
  tasks: "/tasks",
  task: (id: string) => `/tasks/${id}`,

  // Rewards
  rewards: "/rewards",
  reward: (id: string) => `/rewards/${id}`,

  // Stores
  stores: "/stores",
  store: (id: string) => `/stores/${id}`,

  // Merchants
  merchants: "/merchants",
  merchant: (id: string) => `/merchants/${id}`,

  // NFC Cards
  nfcCards: "/nfc-cards",
  nfcCard: (id: string) => `/nfc-cards/${id}`,

  // Reviews
  reviews: "/reviews",

  // Alliance Coupons
  allianceCoupons: "/alliance-coupons",

  // Analytics
  analytics: "/analytics",
};
