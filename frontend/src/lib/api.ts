import axios from "axios";

const api = axios.create({ baseURL: "/api" });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data: object) => api.post("/auth/register", data),
  login: (email: string, password: string) =>
    api.post<{ access_token: string }>("/auth/login", { email, password }),
  me: () => api.get("/auth/me"),
};

// ── Admin ─────────────────────────────────────────────────────────────────────
export const adminApi = {
  listCampaigns: () => api.get("/admin/campaigns"),
  createCampaign: (data: object) => api.post("/admin/campaigns", data),
  getCampaign: (id: string) => api.get(`/admin/campaigns/${id}`),
  updateCampaign: (id: string, data: object) => api.put(`/admin/campaigns/${id}`, data),
  publishCampaign: (id: string) => api.post(`/admin/campaigns/${id}/publish`),
  listRounds: (campaignId: string) => api.get(`/admin/campaigns/${campaignId}/rounds`),
  createRound: (campaignId: string, data: object) =>
    api.post(`/admin/campaigns/${campaignId}/rounds`, data),
  updateRound: (roundId: string, data: object) => api.put(`/admin/rounds/${roundId}`, data),
  deleteRound: (roundId: string) => api.delete(`/admin/rounds/${roundId}`),
  listApplications: (campaignId: string) => api.get(`/admin/campaigns/${campaignId}/applications`),
  getApplication: (id: string) => api.get(`/admin/applications/${id}`),
  getSubmissions: (applicationId: string) => api.get(`/admin/applications/${applicationId}/submissions`),
  manualEvaluate: (submissionId: string, data: object) =>
    api.post(`/admin/submissions/${submissionId}/evaluate`, data),
  triggerAiEval: (roundId: string) => api.post(`/admin/rounds/${roundId}/trigger-ai-eval`),
  shortlist: (roundId: string) => api.post(`/admin/rounds/${roundId}/shortlist`),
};

// ── Candidate ──────────────────────────────────────────────────────────────────
export const candidateApi = {
  listCampaigns: () => api.get("/candidate/campaigns"),
  getCampaign: (id: string) => api.get(`/candidate/campaigns/${id}`),
  getCampaignRounds: (id: string) => api.get(`/candidate/campaigns/${id}/rounds`),
  apply: (campaignId: string) => api.post(`/candidate/campaigns/${campaignId}/apply`),
  getApplication: (id: string) => api.get(`/candidate/applications/${id}`),
  getSubmission: (appId: string, roundId: string) =>
    api.get(`/candidate/applications/${appId}/rounds/${roundId}/submission`),
  saveSubmission: (appId: string, roundId: string, content: string) =>
    api.put(`/candidate/applications/${appId}/rounds/${roundId}/submission`, { content }),
  submitRound: (appId: string, roundId: string) =>
    api.post(`/candidate/applications/${appId}/rounds/${roundId}/submit`),
};
