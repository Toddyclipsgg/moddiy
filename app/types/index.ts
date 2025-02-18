import type { FileMap } from '~/lib/.server/llm/constants';

export interface AnalysisRequest {
  supabaseUrl?: string;
  supabaseKey?: string;
  model?: string;
  provider?: string;
}

export interface AnalysisResponse {
  success: boolean;
  summary?: string;
  relevantFiles?: FileMap;
  error?: string;
} 