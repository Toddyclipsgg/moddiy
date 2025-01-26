import React, { useEffect, useState } from 'react';
import { useTokenUsageStore } from '~/lib/stores/tokenUsage';
import { useAuth } from '~/lib/auth';
import { fetchPlanLimits, type PlanLimits } from '~/lib/supabase';

interface TokenUsageBarProps {
  subscribeUrl?: string;
}

export const TokenUsageBar: React.FC<TokenUsageBarProps> = ({ subscribeUrl = '/pricing' }) => {
  const store = useTokenUsageStore();
  const { user } = useAuth();
  const [maxDailyTokens, setMaxDailyTokens] = useState<number>(20000); // Default to free plan limit

  useEffect(() => {
    const fetchLimits = async () => {
      if (user?.plan?.plan_type) {
        const planLimits = await fetchPlanLimits(user.plan.plan_type);
        if (planLimits) {
          setMaxDailyTokens(planLimits.daily_tokens);
        }
      }
    };

    fetchLimits();
  }, [user?.plan?.plan_type]);

  const tokensRemaining = maxDailyTokens - store.dailyUsage.totalTokens;

  return (
    <div className="flex justify-center w-full">
      <div className="w-[97%] px-2.5 py-1 bg-[#1a1a1a] text-white flex flex-col rounded-t-lg border border-gray-800">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium">
            {tokensRemaining.toLocaleString()} <span className="text-gray-300">remaining</span>
          </span>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span>Prompt: {store.dailyUsage.promptTokens.toLocaleString()}</span>
            <span>Completion: {store.dailyUsage.completionTokens.toLocaleString()}</span>
          </div>
          {tokensRemaining <= 0 && (
            <a
              href={subscribeUrl}
              className="text-[#b44aff] hover:text-[#c67aff] transition-all text-xs font-medium bg-[#2a1a3a] px-3 py-1 rounded-full hover:bg-[#331f47] whitespace-nowrap"
            >
              Subscribe to Pro for 66x more usage
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
