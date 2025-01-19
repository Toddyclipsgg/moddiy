'use client';

import { buttonVariants } from '~/components/ui/button';
import { Label } from '~/components/ui/label';
import { Switch } from '~/components/ui/Switch';
import { useMediaQuery } from '~/hooks/use-media-query';
import { cn } from '~/lib/utils';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import Link from 'next/link';
import { useState, useRef } from 'react';
import confetti from 'canvas-confetti';
import NumberFlow from '@number-flow/react';

interface PricingPlan {
  name: string;
  price: string;
  yearlyPrice: string;
  period: string;
  features: string[];
  description: string;
  buttonText: string;
  href: string;
  isPopular: boolean;
}

interface PricingProps {
  plans: PricingPlan[];
  title?: string;
  description?: string;
}

export function Pricing({
  plans,
  title = 'Simple, Transparent Pricing',
  description = 'Choose the plan that works for you\nAll plans include access to our platform, lead generation tools, and dedicated support.',
}: PricingProps) {
  const [isMonthly, setIsMonthly] = useState(true);
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const switchRef = useRef<HTMLButtonElement>(null);

  const handleToggle = (checked: boolean) => {
    setIsMonthly(!checked);

    if (checked && switchRef.current) {
      const rect = switchRef.current.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;

      confetti({
        particleCount: 50,
        spread: 60,
        origin: {
          x: x / window.innerWidth,
          y: y / window.innerHeight,
        },
        colors: ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--secondary))', 'hsl(var(--muted))'],
        ticks: 200,
        gravity: 1.2,
        decay: 0.94,
        startVelocity: 30,
        shapes: ['circle'],
      });
    }
  };

  return (
    <div className="w-full flex flex-col h-full">
      <div className="text-center mb-[5vh]">
        <h2 className="text-4xl font-bold tracking-tight sm:text-5xl text-bolt-elements-textPrimary px-4">{title}</h2>
        <p className="text-bolt-elements-textSecondary text-lg whitespace-pre-line max-w-2xl mx-auto px-4 mt-1">
          {description}
        </p>
      </div>

      <div className="flex justify-center mb-[5vh]">
        <label className="relative inline-flex items-center cursor-pointer">
          <Label>
            <Switch checked={!isMonthly} onCheckedChange={handleToggle} />
          </Label>
        </label>
        <span className="ml-2 font-semibold text-bolt-elements-textPrimary">
          Annual billing <span className="text-accent">(Save 20%)</span>
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 sm:2 gap-2 max-w-5xl mx-auto px-4 overflow-visible">
        {plans.map((plan, index) => (
          <motion.div
            key={index}
            initial={{ y: 50, opacity: 1 }}
            whileInView={
              isDesktop
                ? {
                    y: plan.isPopular ? -20 : 0,
                    opacity: 1,
                    x: index === 2 ? -30 : index === 0 ? 30 : 0,
                    scale: index === 0 || index === 2 ? 0.94 : 1.0,
                  }
                : {}
            }
            viewport={{ once: true }}
            transition={{
              duration: 1.6,
              type: 'spring',
              stiffness: 100,
              damping: 30,
              delay: 0.4,
              opacity: { duration: 0.5 },
            }}
            className={cn(
              `rounded-2xl border-[1px] p-6 bg-bolt-elements-background-depth-2 text-center lg:flex lg:flex-col lg:justify-center relative max-w-xs`,
              plan.isPopular ? 'border-accent border-2 z-10' : 'border-bolt-elements-borderColor',
              'flex flex-col',
              !plan.isPopular && 'mt-5',
              index === 0 || index === 2
                ? 'z-0 transform translate-x-0 translate-y-0 -translate-z-[50px] rotate-y-[10deg]'
                : 'z-10',
              index === 0 && 'origin-right',
              index === 2 && 'origin-left',
            )}
          >
            <div className="flex-1 flex flex-col h-full justify-between space-y-2">
              <div>
                <p className="text-base font-semibold text-bolt-elements-textSecondary">{plan.name}</p>
                <div className="mt-2 flex items-center justify-center gap-x-2">
                  <span className="text-5xl font-bold tracking-tight text-bolt-elements-textPrimary">
                    <NumberFlow
                      value={isMonthly ? parseFloat(plan.price) : parseFloat(plan.yearlyPrice)}
                      format={{
                        style: 'currency',
                        currency: 'USD',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }}
                      transformTiming={{
                        duration: 500,
                        easing: 'ease-out',
                      }}
                      willChange
                      className="font-variant-numeric: tabular-nums"
                    />
                  </span>
                  {plan.period !== 'Next 3 months' && (
                    <span className="text-sm font-semibold leading-6 tracking-wide text-bolt-elements-textSecondary">
                      / {plan.period}
                    </span>
                  )}
                </div>

                <p className="text-xs leading-5 text-bolt-elements-textSecondary">
                  {isMonthly ? 'billed monthly' : 'billed annually'}
                </p>

                <ul className="mt-2 gap-2 flex flex-col">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-accent mt-1 flex-shrink-0" />
                      <span className="text-left text-bolt-elements-textPrimary">{feature}</span>
                    </li>
                  ))}
                </ul>

                <hr className="w-full my-2 border-bolt-elements-borderColor" />

                <Link
                  href={plan.href}
                  className={cn(
                    buttonVariants({
                      variant: 'outline',
                    }),
                    'group relative w-full gap-2 overflow-hidden text-lg font-semibold tracking-tighter',
                    'transform-gpu ring-offset-current transition-all duration-300 ease-out hover:ring-2 hover:ring-accent hover:ring-offset-1 hover:bg-accent hover:text-accent-foreground',
                    plan.isPopular ? 'bg-white text-black' : 'bg-white text-black',
                  )}
                >
                  {plan.buttonText}
                </Link>
                <p className="mt-2 text-xs leading-5 text-bolt-elements-textSecondary">{plan.description}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
