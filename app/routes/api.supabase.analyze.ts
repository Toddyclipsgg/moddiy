import { json } from '@remix-run/cloudflare';
import type { ActionFunctionArgs } from '@remix-run/cloudflare';
import type { Message } from 'ai';
import type { FileMap } from '~/lib/.server/llm/constants';
import { createSummary } from '~/lib/.server/llm/create-summary';
import { selectContext } from '~/lib/.server/llm/select-context';
import { createScopedLogger } from '~/utils/logger';
import { getApiKeysFromCookie, getProviderSettingsFromCookie } from '~/lib/api/cookies';
import { LLMManager } from '~/lib/modules/llm/manager';
import { PROVIDER_LIST } from '~/utils/constants';
import type { IProviderSetting } from '~/types/model';
import { analyzeProject } from '~/lib/.server/llm/analyzer';
import type { AnalysisRequest, AnalysisResponse } from '~/types';

const logger = createScopedLogger('api.supabase.analyze');

// Types
interface AnalysisRequestBody {
  messages: Message[];
  files: FileMap;
  supabaseUrl?: string;
  supabaseKey?: string;
  model?: string;
  provider?: string;
  providerSettings?: Record<string, IProviderSetting>;
}

interface AnalysisResponse {
  success: boolean;
  summary?: string;
  relevantFiles?: FileMap;
  error?: string;
}

// Helper functions
const validateProvider = (provider: string, apiKeys: Record<string, string>) => {
  if (!provider) return false;
  return Boolean(apiKeys[provider] && apiKeys[provider].length > 0);
};

const getProviderInfo = (provider: string) => {
  return PROVIDER_LIST.find(p => p.name === provider);
};

const getModels = async (
  provider: string, 
  apiKeys: Record<string, string>, 
  settings: Record<string, IProviderSetting>
) => {
  const providerInfo = getProviderInfo(provider);
  if (!providerInfo) {
    throw new Error(`Provider ${provider} not found`);
  }

  const llmManager = LLMManager.getInstance();
  const models = await llmManager.getModelListFromProvider(providerInfo, {
    apiKeys,
    providerSettings: settings,
    serverEnv: {}
  });

  if (!models.length) {
    throw new Error(`No models available for ${provider}`);
  }

  return models;
};

export async function action({ request }: ActionFunctionArgs) {
  try {
    const { supabaseUrl, supabaseKey, model, provider } = 
      await request.json() as AnalysisRequest;

    if (!supabaseUrl || !supabaseKey) {
      return json({ success: false, error: 'Invalid Supabase credentials' });
    }

    const result = await analyzeProject({
      supabaseConfig: { url: supabaseUrl, key: supabaseKey },
      modelConfig: { model, provider }
    });

    return json<AnalysisResponse>(result);
  } catch (error) {
    logger.error('Analysis failed:', error);
    return json<AnalysisResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 