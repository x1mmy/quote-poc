export type SubmissionStatus = "analysing" | "ready" | "error" | "reviewed";

export type StoredQuote = {
  builder: string;
  /** Plaintext from the customer; empty when PDF-only */
  content: string;
  /** Original PDF filename when supplied */
  pdfFileName?: string | null;
};

export type TotalRow = {
  builder: string;
  total_inc_gst: string;
  gst_clear: boolean;
  notes?: string;
};

export type ScopeComparisonRow = {
  item: string;
  builders: Record<string, string>;
};

export type AiAnalysis = {
  totals: TotalRow[];
  scope_comparison: ScopeComparisonRow[];
  scope_gaps: string[];
  red_flags: string[];
  best_value: {
    builder: string;
    reasoning: string;
  };
  summary: string;
};

export type Submission = {
  id: string;
  projectDescription: string;
  quotes: StoredQuote[];
  status: SubmissionStatus;
  aiAnalysis: AiAnalysis | null;
  partnerNotes: string;
  createdAt: string;
  errorCode?: string;
  errorMessage?: string;
};

export type AnalyseApiSuccess = {
  analysis: AiAnalysis;
};

export type AnalyseApiError = {
  error: string;
  message?: string;
  index?: number;
  maxMb?: number;
  rawSnippet?: string;
  /** When Google returns 429 / quota guidance */
  retryAfterSeconds?: number;
};
