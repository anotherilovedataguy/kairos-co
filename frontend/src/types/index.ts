export interface User {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "candidate";
  created_at: string;
  company_name?: string;
}

export interface Campaign {
  id: string;
  title: string;
  description: string;
  job_posting: string;
  status: "draft" | "active" | "closed";
  created_at: string;
  company_name?: string;
  round_count?: number;
}

export interface Round {
  id: string;
  campaign_id: string;
  order: number;
  name: string;
  type: "resume" | "coding";
  evaluation_mode: "ai" | "manual";
  ai_provider?: "claude" | "gemini" | "chatgpt";
  evaluation_criteria: string;
  shortlist_count?: number;
  auto_select: boolean;
  created_at: string;
}

export interface RoundPublic {
  id: string;
  order: number;
  name: string;
  type: "resume" | "coding";
}

export interface Application {
  id: string;
  candidate_id: string;
  campaign_id: string;
  status: "applied" | "in_progress" | "shortlisted" | "rejected";
  current_round_order: number;
  created_at: string;
  candidate_name?: string;
}

export interface Submission {
  id: string;
  application_id: string;
  round_id: string;
  content: string;
  status: "pending" | "submitted" | "evaluated";
  submitted_at?: string;
}

export interface Evaluation {
  id: string;
  submission_id: string;
  score?: number;
  feedback: string;
  evaluated_by: "ai" | "manual";
  created_at: string;
}

export interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

export interface NotebookCell {
  id: string;
  type: "code" | "markdown";
  source: string;
  outputs: CellOutput[];
  execution_count?: number;
}

export interface CellOutput {
  output_type: "stream" | "error";
  text: string;
}
