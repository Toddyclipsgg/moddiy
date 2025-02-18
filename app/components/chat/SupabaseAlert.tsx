import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { classNames } from '~/utils/classNames';
import type { ActionAlert } from '~/types/actions';
import type { Message } from 'ai';
// Removed missing hooks imports: useChat and useWorkspace
// import { useChat } from '../../hooks/useChat';
// import { useWorkspace } from '../../hooks/useWorkspace';
import { LLMManager } from '~/lib/modules/llm/manager';
import { DEFAULT_MODEL, DEFAULT_PROVIDER, PROVIDER_LIST } from '~/utils/constants';
import Cookies from 'js-cookie';
import type { ModelInfo } from '~/lib/modules/llm/types';
import type { ProviderInfo } from '~/types/model';

// Adding stub implementations for missing hooks since they were intentionally excluded
const useChat = () => ({ messages: [] });
const useWorkspace = () => ({ files: {} });

// Helper function to extract properties from message
function extractPropertiesFromMessage(message: Message) {
  let content = message.content;
  let model = DEFAULT_MODEL;
  let provider = '';

  // If content is an array, find the text content
  if (Array.isArray(content)) {
    const textContent = content.find(item => item.type === 'text');
    content = textContent?.text || '';
  }

  // Extract model and provider from content if present
  const modelMatch = content.match(/model:\s*([^\s,]+)/i);
  const providerMatch = content.match(/provider:\s*([^\s,]+)/i);

  if (modelMatch) model = modelMatch[1];
  if (providerMatch) provider = providerMatch[1];

  // Clean up content by removing model and provider specifications
  content = content
    .replace(/model:\s*[^\s,]+/i, '')
    .replace(/provider:\s*[^\s,]+/i, '')
    .trim();

  return { model, provider, content };
}

// Types
type FileMap = Record<string, string>;

// Constants
const SUPABASE_STEPS = [
  {
    title: "Configure Credentials",
    description: "Enter your Supabase credentials to continue.",
    icon: "i-ph:key"
  },
  {
    title: "Analyzing Project",
    description: "Analyzing your project structure and requirements...",
    icon: "i-ph:magnifying-glass"
  },
  {
    title: "Database Setup",
    description: "Setting up your database schema and tables...",
    icon: "i-ph:database"
  },
  {
    title: "Security Configuration",
    description: "Configuring authentication and security policies...",
    icon: "i-ph:shield-check"
  },
  {
    title: "Integration",
    description: "Integrating Supabase with your application...",
    icon: "i-ph:plug"
  },
  {
    title: "Complete",
    description: "Your database is ready to use!",
    icon: "i-ph:check-square"
  }
] as const;

// Styles
const STYLES = {
  card: "bg-[#1C1C1C] border border-[#2E2E2E] rounded-lg shadow-lg overflow-hidden",
  button: {
    base: "px-3 py-1.5 rounded text-sm font-medium flex items-center gap-1.5",
    primary: "bg-[#3ECF8E] text-black hover:bg-[#3ECF8E]/90",
    secondary: "bg-[#2E2E2E] text-white hover:bg-[#404040]",
    icon: "text-sm",
    close: "text-gray-400 hover:text-white transition-colors"
  },
  input: "w-full px-2.5 py-1.5 text-sm rounded bg-[#2E2E2E] border border-[#404040] focus:border-[#3ECF8E] outline-none text-white placeholder-gray-500",
  label: "block text-xs mb-1 text-gray-400",
  text: {
    title: "text-sm font-medium text-white",
    description: "text-sm text-gray-400",
    small: "text-xs text-gray-400"
  },
  icon: {
    base: "text-[#3ECF8E]",
    small: "text-sm",
    medium: "text-lg",
    large: "text-xl"
  }
};

// Types
interface SupabaseAlertProps {
  alert: ActionAlert;
  clearAlert: () => void;
  postMessage: (message: string) => void;
}

interface IconProps {
  name: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

interface ButtonProps {
  variant: 'primary' | 'secondary';
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}

interface InputProps {
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
}

interface AnalysisResponse {
  success: boolean;
  summary?: string;
  relevantFiles?: FileMap;
  error?: string;
}

interface ProviderState {
  provider: string;
  model: string;
  apiKey?: string;
  models: ModelInfo[];
}

interface ProjectState {
  summary?: string;
  relevantFiles?: Record<string, string>;
  error?: string;
}

interface BaseProvider {
  name: string;
  apiKeys?: Record<string, string>;
  settings?: Record<string, any>;
}

// Reusable Components
const Icon = ({ name, size = 'small', className }: IconProps) => (
  <div className={classNames(name, STYLES.icon[size], className)} />
);

const Button = ({ variant, onClick, children, className }: ButtonProps) => (
  <button
    onClick={onClick}
    className={classNames(
      STYLES.button.base,
      variant === 'primary' ? STYLES.button.primary : STYLES.button.secondary,
      className
    )}
  >
    {children}
  </button>
);

const Input = ({ id, label, value, onChange, placeholder }: InputProps) => (
  <div>
    <label className={STYLES.label} htmlFor={id}>
      {label}
    </label>
    <input
      id={id}
      type="text"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={STYLES.input}
    />
  </div>
);

const StepProgress = ({ currentStep }: { currentStep: number }) => (
  <div className="px-3 py-2 border-b border-[#2E2E2E]">
    <div className="flex items-center justify-between">
      {SUPABASE_STEPS.map((step, index) => (
        <div
          key={index}
          className={classNames(
            "flex items-center",
            { "flex-1": index < SUPABASE_STEPS.length - 1 }
          )}
        >
          <div
            className={classNames(
              "w-6 h-6 rounded-full flex items-center justify-center border-2",
              currentStep > index + 1
                ? "bg-[#3ECF8E] border-[#3ECF8E] text-black"
                : currentStep === index + 1
                ? "border-[#3ECF8E] text-[#3ECF8E]"
                : "border-[#404040] text-[#404040]"
            )}
          >
            <Icon name={step.icon} />
          </div>
          {index < SUPABASE_STEPS.length - 1 && (
            <div
              className={classNames(
                "h-[2px] flex-1 mx-1",
                currentStep > index + 1
                  ? "bg-[#3ECF8E]"
                  : "bg-[#404040]"
              )}
            />
          )}
        </div>
      ))}
    </div>
  </div>
);

// Main Component
function SupabaseAlertContent({ alert, clearAlert, postMessage }: SupabaseAlertProps) {
  // State
  const [currentStep, setCurrentStep] = useState(1);
  const [expanded, setExpanded] = useState(false);
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [projectAnalysis, setProjectAnalysis] = useState<ProjectState>({});
  const [providerState, setProviderState] = useState<ProviderState>({
    provider: '',
    model: DEFAULT_MODEL,
    models: []
  });

  // Get chat and workspace context
  const { messages } = useChat();
  const { files } = useWorkspace();

  // Initialize provider
  const initializeProvider = useCallback(async (): Promise<ProviderState | undefined> => {
    try {
      console.log('Initializing provider...');
      
      // Try to find a provider with a valid API key
      let selectedProvider = '';
      let validApiKeys: Record<string, string> = {};
      
      // Try to get enabled providers from the providers cookie
      const providersCookie = Cookies.get('providers');
      const enabledProviders = providersCookie ? JSON.parse(decodeURIComponent(providersCookie)) : {};
      console.log('Enabled providers:', enabledProviders);

      // Try to get API keys from the apiKeys cookie
      const apiKeysCookie = Cookies.get('apiKeys');
      const storedApiKeys = apiKeysCookie ? JSON.parse(decodeURIComponent(apiKeysCookie)) : {};
      console.log('Stored API keys:', Object.keys(storedApiKeys));

      // First check OpenAI as it's commonly used
      if (enabledProviders['OpenAI']?.enabled) {
        const openAIKey = storedApiKeys['OpenAI'] || process.env.OPENAI_API_KEY;
        if (openAIKey && openAIKey.length > 0) {
          selectedProvider = 'OpenAI';
          validApiKeys['OpenAI'] = openAIKey;
        }
      }

      // If OpenAI is not available, try other enabled providers
      if (!selectedProvider) {
        for (const provider of PROVIDER_LIST) {
          if (enabledProviders[provider.name]?.enabled) {
            const apiKey = storedApiKeys[provider.name] || 
                          Cookies.get(`${provider.name}ApiKey`) || 
                          Cookies.get(`${provider.name.toLowerCase()}ApiKey`);
            
            if (apiKey && apiKey.length > 0) {
              console.log('Found valid API key for provider:', provider.name);
              selectedProvider = provider.name;
              validApiKeys[provider.name] = apiKey;
              break;
            }
          }
        }
      }

      // If still no provider found, try one last time with any available provider
      if (!selectedProvider) {
        for (const provider of PROVIDER_LIST) {
          const apiKey = storedApiKeys[provider.name] || 
                        Cookies.get(`${provider.name}ApiKey`) || 
                        Cookies.get(`${provider.name.toLowerCase()}ApiKey`);
          
          if (apiKey && apiKey.length > 0) {
            console.log('Found valid API key for provider:', provider.name);
            selectedProvider = provider.name;
            validApiKeys[provider.name] = apiKey;
            break;
          }
        }
      }

      // Modified section: Remove dummy API key fallback
      if (!selectedProvider) {
        console.log('No provider found with valid API key');
        setProjectAnalysis({
          error: 'Please configure a provider API key in settings'
        });
        return undefined;
      }

      console.log('Selected provider:', selectedProvider);
      
      const providerInfo = PROVIDER_LIST.find(p => p.name === selectedProvider);
      if (!providerInfo) {
        throw new Error('Provider not found in available list');
      }

      const llmManager = LLMManager.getInstance();
      const models = await llmManager.getModelListFromProvider(providerInfo, {
        apiKeys: validApiKeys,
        providerSettings: enabledProviders[selectedProvider] || {},
        serverEnv: {}
      });

      if (!models.length) {
        throw new Error(`No models available for ${selectedProvider}`);
      }

      const newProviderState: ProviderState = {
        provider: selectedProvider,
        model: models[0].name,
        apiKey: validApiKeys[selectedProvider],
        models
      };

      console.log('Provider state created successfully:', { 
        provider: newProviderState.provider,
        model: newProviderState.model,
        hasApiKey: !!newProviderState.apiKey,
        modelCount: newProviderState.models.length
      });

      setProviderState(newProviderState);
      return newProviderState;

    } catch (error) {
      console.error('Provider initialization failed:', error);
      console.error('Current state:', {
        providerState,
        cookies: document.cookie,
        availableProviders: PROVIDER_LIST.map(p => p.name)
      });
      setProjectAnalysis({
        error: error instanceof Error ? error.message : 'Failed to initialize provider'
      });
      return undefined;
    }
  }, []);

  // Effect to initialize provider
  useEffect(() => {
    if (expanded) {
      initializeProvider();
    }
  }, [expanded, initializeProvider]);

  // Handle continue
  const handleContinue = useCallback(async () => {
    setProjectAnalysis({});

    // Validate Supabase credentials
    if (!supabaseUrl || !supabaseKey) {
      setProjectAnalysis({ error: 'Please enter both the Project URL and API Key' });
      return;
    }

    try {
      new URL(supabaseUrl);
    } catch (e) {
      setProjectAnalysis({ error: 'Please enter a valid Project URL' });
      return;
    }

    // Validate provider
    if (!providerState.provider || !providerState.apiKey) {
      const initialized = await initializeProvider();
      if (!initialized || !initialized.apiKey) {
        setProjectAnalysis({ error: 'Please configure a provider API key in settings' });
        return;
      }
    }

    setIsProcessing(true);
  }, [supabaseUrl, supabaseKey, providerState, initializeProvider]);

  // Handle analysis
  const analyzeProject = useCallback(async () => {
    try {
      const response = await fetch('/api/supabase/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': document.cookie
        },
        body: JSON.stringify({
          messages,
          files,
          supabaseUrl,
          supabaseKey,
          model: providerState.model,
          provider: providerState.provider,
          providerSettings: providerState.apiKey ? { 
            [providerState.provider]: { apiKey: providerState.apiKey } 
          } : undefined
        })
      });

      const data = await response.json() as AnalysisResponse;
      
      if (data.success) {
        setProjectAnalysis({
          summary: data.summary,
          relevantFiles: data.relevantFiles
        });
        setCurrentStep(prev => Math.min(prev + 1, 6));
      } else {
        setProjectAnalysis({ error: data.error || 'Analysis failed' });
      }
    } catch (error) {
      setProjectAnalysis({ error: 'Failed to analyze project' });
    } finally {
      setIsProcessing(false);
    }
  }, [messages, files, supabaseUrl, supabaseKey, providerState, retryCount]);

  useEffect(() => {
    analyzeProject();
  }, [analyzeProject]);

  const handleAccept = () => setExpanded(true);
  const handleSubmit = () => {
    const formattedPrompt = `Setting up Supabase with URL: ${supabaseUrl || 'AUTO_GENERATED'} and Key: ${supabaseKey || 'AUTO_GENERATED'}`;
    postMessage(formattedPrompt);
    clearAlert();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="w-full"
      >
        <div className={STYLES.card}>
          {!expanded ? (
            // Initial compact view
            <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
                <div className={STYLES.icon.base}>
                  <Icon name="i-ph:database" size="large" />
                </div>
                <div>
                  <h3 className={STYLES.text.title}>{alert.description || "Would you like to set up Supabase?"}</h3>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="primary" onClick={handleAccept}>
                  <Icon name="i-ph:check-circle" />
                  Accept
                </Button>
                <Button variant="secondary" onClick={clearAlert}>
                  <Icon name="i-ph:x-circle" />
                  Dismiss
                </Button>
                <a
                  href="https://supabase.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[#3ECF8E] hover:text-[#3ECF8E]/90 flex items-center gap-1"
                >
                  <Icon name="i-ph:arrow-right" />
                  Learn More
                </a>
          </div>
        </div>
          ) : (
            // Expanded view with steps
            <div>
              <div className="flex items-center justify-between p-3 border-b border-[#2E2E2E]">
                <div className="flex items-center gap-2">
                  <img
                    src="/supabase/supabase-logo-icon.png"
                    alt="Supabase"
                    className="w-5 h-5 object-contain"
                  />
                  <h3 className={STYLES.text.title}>
                    {SUPABASE_STEPS[currentStep - 1].title}
                  </h3>
                </div>
                <Button variant="secondary" onClick={clearAlert}>
                  <Icon name="i-ph:x" />
                </Button>
              </div>

              <StepProgress currentStep={currentStep} />

              {/* Content Area */}
              <div className="p-4">
                <div className="space-y-3">
                  {/* Credentials Input - Step 1 */}
                  {currentStep === 1 && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          id="supabase-url"
                          label="Project URL"
                          value={supabaseUrl}
                          onChange={(e) => setSupabaseUrl(e.target.value)}
                          placeholder="https://xxx.supabase.co"
                        />
                        <Input
                          id="supabase-key"
                          label="API Key"
                          value={supabaseKey}
                          onChange={(e) => setSupabaseKey(e.target.value)}
                          placeholder="your-api-key"
                        />
                      </div>
                      {projectAnalysis.error && (
                        <div className="mt-2 p-2 text-sm text-red-400 bg-red-500/10 rounded">
                          {projectAnalysis.error}
                        </div>
                      )}
                      <div className="flex justify-end mt-4">
                        <Button variant="primary" onClick={handleContinue}>
                          Continue
                          <Icon name="i-ph:arrow-right" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Auto Setup Progress - Steps 2-5 */}
                  {currentStep > 1 && currentStep < 6 && (
                    <div className="flex items-center justify-center py-2">
                      <div className="animate-spin mr-2">
                        <Icon name="i-ph:circle-notch" size="large" className={STYLES.icon.base} />
                      </div>
                      <span className={STYLES.text.description}>
                        {SUPABASE_STEPS[currentStep - 1].description}
                      </span>
                        </div>
                  )}

                  {/* Setup Complete - Step 6 */}
                  {currentStep === 6 && (
                    <div className="text-center py-2">
                      <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#3ECF8E]/10 mb-3">
                        <Icon name="i-ph:check-circle" size="large" className={STYLES.icon.base} />
                      </div>
                      <h5 className={classNames(STYLES.text.title, "mb-1")}>Setup Complete!</h5>
                      <p className={STYLES.text.small}>
                        Your database is ready to use. You can now start using Supabase in your project.
                      </p>
                      <div className="flex justify-end mt-4">
                        <Button variant="primary" onClick={handleSubmit}>
                          <Icon name="i-ph:check-circle" />
                          Finish Setup
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Analysis results display */}
                  {currentStep === 2 && (
                    <div className="p-4 text-sm text-gray-400">
                      <div className="animate-pulse flex items-center gap-2">
                        <div className="i-ph:circle-notch animate-spin" />
                        Analyzing project structure...
                      </div>
                      {projectAnalysis.error ? (
                        <div className="mt-4 p-3 bg-red-500/10 text-red-400 rounded">
                          {projectAnalysis.error}
                        </div>
                      ) : (
                        <>
                          {projectAnalysis.summary && (
                            <div className="mt-4 space-y-2">
                              <div className="font-medium text-white">Project Analysis</div>
                              <div className="text-xs bg-[#2E2E2E] p-3 rounded">
                                {projectAnalysis.summary.split('\n').map((line, i) => (
                                  <div key={i}>{line}</div>
                                ))}
                              </div>
                            </div>
                          )}
                          {projectAnalysis.relevantFiles && Object.keys(projectAnalysis.relevantFiles).length > 0 && (
                            <div className="mt-4 space-y-2">
                              <div className="font-medium text-white">Relevant Files</div>
                              <div className="text-xs bg-[#2E2E2E] p-3 rounded">
                                {Object.keys(projectAnalysis.relevantFiles).map((file, i) => (
                                  <div key={i} className="flex items-center gap-2">
                                    <div className="i-ph:file-text" />
                                    {file}
                    </div>
                  ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
              </div>
        )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Export the component
export default function SupabaseAlert(props: SupabaseAlertProps) {
  return <SupabaseAlertContent {...props} />;
}

// Add these helper functions to resolve 'getProviderConfig' and 'validateProvider' errors
const getProviderConfig = (provider: string): BaseProvider | undefined => {
  return PROVIDER_LIST.find(p => p.name === provider);
};

// Update the validateProvider function to be more lenient and add logging
const validateProvider = (provider: string, apiKeys: Record<string, string>) => {
  console.log('Validating provider:', provider);
  console.log('Available apiKeys:', apiKeys);
  
  if (!provider) {
    console.log('No provider specified');
    return false;
  }
  
  // Check for API key in various formats
  const possibleKeys = [
    apiKeys[provider],
    Cookies.get(`${provider}ApiKey`),
    Cookies.get(`${provider.toLowerCase()}ApiKey`),
    Cookies.get(`${provider}_api_key`),
    Cookies.get(`${provider.toLowerCase()}_api_key`)
  ];
  
  console.log('Possible API keys found:', possibleKeys.map(k => k ? 'present' : 'missing'));
  
  return possibleKeys.some(key => key && key.length > 0);
}; 