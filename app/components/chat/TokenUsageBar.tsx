import React from 'react';

interface TokenUsageBarProps {
  tokensRemaining: number;
  subscribeUrl?: string;
}

export const TokenUsageBar: React.FC<TokenUsageBarProps> = ({
  tokensRemaining,
  subscribeUrl = '#'
}) => {
  return (
    <div className="flex justify-center w-full">
      <div className="w-[97%] px-4 py-1.5 bg-[#1a1a1a] text-white flex justify-between items-center text-sm rounded-t-lg border border-gray-800">
        <div>
          <span className="font-medium">{tokensRemaining.toLocaleString()}</span>
          <span className="text-gray-300"> daily tokens remaining.</span>
        </div>
        <a
          href={subscribeUrl}
          className="text-[#b44aff] hover:text-[#c67aff] transition-colors"
        >
          Subscribe to Pro for 66x more usage
        </a>
      </div>
    </div>
  );
};
