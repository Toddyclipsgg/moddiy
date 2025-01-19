import React from 'react';
import { useTokenUsageStore } from '~/lib/stores/tokenUsage';

interface TokenUsageBarProps {
  subscribeUrl?: string;
}

export const TokenUsageBar: React.FC<TokenUsageBarProps> = ({ subscribeUrl = '/pricing' }) => {
  const store = useTokenUsageStore();
  const maxTokens = 10000; // Usando o mesmo valor do store original
  const tokensRemaining = maxTokens - store.dailyUsage.totalTokens;
  const usagePercentage = (store.dailyUsage.totalTokens / maxTokens) * 100;

  return (
    <div className="flex justify-center w-full">
      <div className="w-[97%] px-4 py-1.5 bg-[#1a1a1a] text-white flex flex-col gap-1 rounded-t-lg border border-gray-800">
        <div className="flex justify-between items-center text-sm">
          <div>
            <span className="font-medium">{tokensRemaining.toLocaleString()}</span>
            <span className="text-gray-300"> daily tokens remaining</span>
          </div>
          <a href={subscribeUrl} className="text-[#b44aff] hover:text-[#c67aff] transition-colors">
            Subscribe to Pro for 66x more usage
          </a>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-1.5">
          <div 
            className="bg-[#b44aff] h-1.5 rounded-full transition-all duration-300" 
            style={{ width: `${Math.min(usagePercentage, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400">
          <span>Prompt: {store.dailyUsage.promptTokens.toLocaleString()}</span>
          <span>Completion: {store.dailyUsage.completionTokens.toLocaleString()}</span>
          <span>Total: {store.dailyUsage.totalTokens.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};
