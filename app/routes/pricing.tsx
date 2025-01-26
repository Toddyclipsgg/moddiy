import type { MetaFunction } from "@remix-run/node";
import { useNavigate } from "@remix-run/react";
import { useState } from "react";

export const meta: MetaFunction = () => {
  return [
    { title: "Pricing - Bolt" },
    { name: "description", content: "Choose the right plan to supercharge your development workflow" },
  ];
};

const BrandingElement = () => (
  <div className="absolute top-0 left-0 w-full h-96 overflow-hidden -z-10 opacity-30">
    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-purple-600/20" />
    <div className="w-[800px] h-[800px] rotate-45 bg-gradient-to-r from-purple-500/10 to-purple-600/10 transform -translate-x-1/2 -translate-y-1/2 absolute top-0 left-1/2" />
    <div className="w-[600px] h-[600px] rotate-45 bg-gradient-to-r from-purple-600/10 to-purple-500/10 transform translate-x-1/2 -translate-y-1/2 absolute top-0 right-1/2" />
  </div>
);

export default function Pricing() {
  const navigate = useNavigate();
  const [isAnnual, setIsAnnual] = useState(false);

  const plans = [
    {
      name: "Free",
      price: 0,
      tokens: "1M",
      highlight: false,
      features: [
        "Basic code completion",
        "Public repositories",
        "Community support",
        "Standard response time"
      ],
      description: "Perfect for solo developers exploring AI-powered development.",
      cta: "Get Started",
      ctaAction: () => navigate("/signup")
    },
    {
      name: "Pro",
      price: isAnnual ? 18 : 20,
      tokens: "7M",
      maxTokens: "5M",
      highlight: true,
      features: [
        "Advanced code completion",
        "Private repositories",
        "Priority support",
        "Faster response time",
        "Custom snippets"
      ],
      description: "Ideal for professional developers seeking enhanced productivity.",
      cta: "Upgrade to Pro",
      ctaAction: () => navigate("/signup?plan=pro")
    },
    {
      name: "Team",
      price: isAnnual ? 45 : 50,
      tokens: "25M",
      maxTokens: "20M",
      highlight: false,
      features: [
        "Team collaboration",
        "Shared snippets",
        "Admin dashboard",
        "Usage analytics",
        "Team training",
        "24/7 support"
      ],
      description: "Perfect for teams looking to streamline their development process.",
      cta: "Choose Team",
      ctaAction: () => navigate("/signup?plan=team")
    },
    {
      name: "Enterprise",
      price: "Custom",
      tokens: "120M+",
      maxTokens: "",
      highlight: false,
      features: [
        "Custom integrations",
        "Dedicated support",
        "SLA guarantees",
        "Security features",
        "Custom training",
        "API access"
      ],
      description: "Tailored solutions for large organizations with specific needs.",
      cta: "Contact Sales",
      ctaAction: () => navigate("/contact")
    }
  ];

  return (
    <div className="min-h-screen bg-[#121212] text-white relative pt-16 pb-20 px-4">
      <button
        onClick={() => navigate('/')}
        className="absolute left-4 top-4 flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] text-white hover:text-white/80 rounded-lg transition-colors"
      >
        <svg 
          className="w-5 h-5" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M10 19l-7-7m0 0l7-7m-7 7h18" 
          />
        </svg>
        <span className="text-sm">Voltar</span>
      </button>

      <BrandingElement />
      
      <div className="max-w-7xl mx-auto relative">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-purple-500 inline-block text-transparent bg-clip-text py-2">
            Pricing
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto px-4">
            Start with a free account to speed up your workflow on public projects or
            boost your entire team with instantly-opening production environments.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center items-center gap-4 mb-12">
          <span className={`text-sm ${!isAnnual ? 'text-white' : 'text-gray-400'}`}>Monthly</span>
          <button
            onClick={() => setIsAnnual(!isAnnual)}
            className="relative w-16 h-8 bg-[#1A1A1A] rounded-full p-1 transition-colors"
          >
            <div
              className={`w-6 h-6 rounded-full bg-purple-500 absolute top-1 transition-transform duration-200 ${
                isAnnual ? 'translate-x-8' : 'translate-x-0'
              }`}
            />
          </button>
          <div className="flex items-center gap-2">
            <span className={`text-sm ${isAnnual ? 'text-white' : 'text-gray-400'}`}>Annual</span>
            <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-400 rounded-full">
              Save 20%
            </span>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-4 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative bg-[#1A1A1A] rounded-xl p-8 transition-transform duration-300 hover:scale-105 ${
                plan.highlight ? 'ring-2 ring-purple-500' : ''
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-purple-500 text-white text-sm rounded-full">
                  Most Popular
                </div>
              )}
              
              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <p className="text-gray-400 text-sm h-12">{plan.description}</p>
              </div>

              <div className="mb-6">
                {typeof plan.price === 'number' ? (
                  <div className="flex items-baseline">
                    <span className="text-4xl font-bold">${plan.price}</span>
                    <span className="text-gray-400 ml-2">/month</span>
                  </div>
                ) : (
                  <div className="text-4xl font-bold">{plan.price}</div>
                )}
              </div>

              <div className="flex items-center gap-2 mb-6">
                <span className="text-purple-400">⚡</span>
                <span className="text-green-400">{plan.tokens} tokens</span>
                {plan.maxTokens && (
                  <span className="text-gray-400 line-through">{plan.maxTokens} tokens</span>
                )}
              </div>

              <div className="space-y-4 mb-8">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-300">{feature}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={plan.ctaAction}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                  plan.highlight
                    ? 'bg-purple-500 hover:bg-purple-600 text-white'
                    : 'bg-[#242424] hover:bg-[#2A2A2A] text-gray-300'
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
