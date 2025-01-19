import { Pricing } from '~/components/pricing';
import { AppLayout } from '~/components/layout/AppLayout';
import { json, type LoaderFunction } from '@remix-run/cloudflare';

interface Plan {
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

export const loader: LoaderFunction = async () => {
  return json({});
};

const plans: Plan[] = [
  {
    name: 'Free',
    price: '9',
    yearlyPrice: '99',
    period: 'month',
    features: ['1,000 daily tokens', 'Basic code generation', 'Community support'],
    description: 'Perfect for trying out Bolt',
    buttonText: 'Start Free',
    href: '/',
    isPopular: false,
  },
  {
    name: 'Pro',
    price: '29',
    yearlyPrice: '290',
    period: 'month',
    features: ['66,000 daily tokens', 'Advanced code generation', 'Priority support', 'Early access to new features'],
    description: 'Best for professional developers',
    buttonText: 'Subscribe',
    href: '/',
    isPopular: true,
  },
  {
    name: 'Enterprise',
    price: '99',
    yearlyPrice: '990',
    period: 'month',
    features: ['Unlimited tokens', 'Custom integrations', 'Dedicated support', 'Custom features', 'SLA'],
    description: 'For teams and organizations',
    buttonText: 'Contact Sales',
    href: '/',
    isPopular: false,
  },
];

export default function PricingPage() {
  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        <Pricing
          plans={plans}
          title="Simple, Transparent Pricing"
          description="Choose the plan that works for you. All plans include access to our platform, lead generation tools, and dedicated support."
        />
      </div>
    </AppLayout>
  );
}
