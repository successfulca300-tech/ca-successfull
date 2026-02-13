import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Crown,
  Gem,
  HelpCircle,
  ShieldCheck,
  Smile,
  TrendingUp,
  Users,
} from 'lucide-react';

import Layout from '@/components/layout/Layout';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { MentorshipPaperSelector } from '@/components/MentorshipPaperSelector';
import { openRazorpay } from '@/utils/razorpay';
import { toast } from 'sonner';

type UserRole = 'admin' | 'subadmin' | 'user' | string;

type Plan = {
  _id: string;
  tier: 'basic' | 'golden' | 'platinum';
  title: string;
  price: number;
  bestFor: string;
  features: string[];
};

const plans: Plan[] = [
  {
    _id: 'mentorship_basic_01',
    tier: 'basic',
    title: 'Basic Mentorship Plan',
    price: 1499,
    bestFor: 'Self-driven students who need structured guidance and expert support.',
    features: [
      'Basic study planner for the respective attempt',
      'Mentor assigned for academic doubt discussions',
      'Expert academic guidance throughout the attempt',
      'Performance evaluation by experts (within 10 days)',
      'Personal doubt-solving group access',
      'Full academic support till examinations',
    ],
  },
  {
    _id: 'mentorship_golden_02',
    tier: 'golden',
    title: 'Golden Mentorship Plan',
    price: 2999,
    bestFor: 'Students seeking personalized planning and regular academic monitoring.',
    features: [
      'All features of the Basic Mentorship Plan',
      'Personalized study planner based on student profile',
      'Dedicated one-to-one mentor (limited expert support)',
      'Complimentary test series for any 3 papers',
      'Weekly academic support sessions',
      'Continuous progress tracking and mentor feedback',
    ],
  },
  {
    _id: 'mentorship_platinum_03',
    tier: 'platinum',
    title: 'Platinum Mentorship Plan',
    price: 4999,
    bestFor: 'Serious aspirants who want intensive, priority, and continuous mentorship.',
    features: [
      'All features of Basic and Golden Plans',
      'One-to-one personal mentorship with expert',
      'Performance evaluation twice a week',
      'Complimentary test series for 5 papers',
      'Dedicated mentor with continuous expert support',
      'Twice-weekly academic support and progress tracking',
      'Priority doubt-solving support till exams',
    ],
  },
];

const faqItems = [
  {
    question: 'What is the CA Mentorship Program?',
    answer:
      'Our CA Mentorship Program is a comprehensive support system designed to help CA students at all levels. We provide structured study plans, personalized guidance from experienced mentors, performance tracking, and doubt-solving support to ensure you are well-prepared for your exams.',
  },
  {
    question: 'Who are the mentors?',
    answer:
      'Our mentors are experienced Chartered Accountants and academic experts who have a deep understanding of the CA curriculum and examination patterns. They are dedicated to providing personalized guidance and support to help you achieve your goals.',
  },
  {
    question: 'How does the study planner work?',
    answer:
      'The study planner is a customized schedule designed to cover the entire syllabus in a structured manner. For Golden and Platinum plan users, the planner is personalized based on your specific strengths, weaknesses, and available study time. It helps you stay on track and ensures timely completion of your preparation.',
  },
  {
    question: 'What kind of support can I expect for doubt solving?',
    answer:
      'All our plans include access to a personal doubt-solving group. Golden and Platinum members receive additional one-to-one support from their dedicated mentors. Platinum members get priority doubt-solving with the fastest resolution times.',
  },
  {
    question: 'Can I upgrade my mentorship plan later?',
    answer:
      'Yes, you can upgrade your plan at any time. You will only need to pay the difference in the plan fees. Please contact our support team to assist you with the upgrade process.',
  },
];

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const planIconMap: Record<Plan['tier'], React.ReactNode> = {
  basic: <StarBadge />,
  golden: <Crown className="text-amber-500" size={22} aria-hidden="true" />,
  platinum: <Gem className="text-sky-500" size={22} aria-hidden="true" />,
};

function StarBadge() {
  return (
    <div className="rounded-full bg-primary/10 p-1.5" aria-hidden="true">
      <ShieldCheck className="text-primary" size={18} />
    </div>
  );
}

function parseStoredUser(raw: string | null): { role?: UserRole } | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed;
    return null;
  } catch {
    return null;
  }
}

const MentorshipPage: React.FC = () => {
  const navigate = useNavigate();
  const [processingPlanId, setProcessingPlanId] = React.useState<string | null>(null);
  const [showPaperSelector, setShowPaperSelector] = React.useState(false);
  const [selectedPlan, setSelectedPlan] = React.useState<Plan | null>(null);
  const [selectedPapers, setSelectedPapers] = React.useState<string[]>([]);

  const getPaperLimit = (tier: Plan['tier']): number => {
    if (tier === 'golden') return 3;
    if (tier === 'platinum') return 5;
    return 0; // Basic doesn't include papers
  };

  const handleBuyNow = async (plan: Plan) => {
    if (processingPlanId) return;

    const user = parseStoredUser(localStorage.getItem('user'));
    const token = localStorage.getItem('token');

    if (!user || !token) {
      toast.error('Please login to purchase');
      navigate('/login');
      return;
    }

    if (user.role === 'admin' || user.role === 'subadmin') {
      toast.error('Admins and sub-admins cannot purchase');
      return;
    }

    // For Golden and Platinum, show paper selector
    if (plan.tier === 'golden' || plan.tier === 'platinum') {
      setSelectedPlan(plan);
      setSelectedPapers([]);
      setShowPaperSelector(true);
      return;
    }

    // For Basic, proceed directly to payment
    try {
      setProcessingPlanId(plan._id);
      await openRazorpay('mentorship', plan);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Payment failed';
      console.error('Payment error', err);
      toast.error(message);
    } finally {
      setProcessingPlanId(null);
    }
  };

  const handlePaperConfirm = async (papers: string[]) => {
    if (!selectedPlan) return;

    try {
      setProcessingPlanId(selectedPlan._id);
      // Pass papers as metadata to Razorpay
      await openRazorpay('mentorship', selectedPlan, undefined, papers);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Payment failed';
      console.error('Payment error', err);
      toast.error(message);
    } finally {
      setProcessingPlanId(null);
      setShowPaperSelector(false);
      setSelectedPlan(null);
      setSelectedPapers([]);
    }
  };

  return (
    <Layout>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(50px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.5s ease-out forwards;
        }
        .animate-slide-in-up {
          animation: slideInUp 0.6s ease-out forwards;
        }
        .plan-card:hover {
          transform: translateY(-10px);
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }
        .icon-container:hover {
          transform: scale(1.1);
        }
      `}</style>

      <div className="bg-primary py-12">
        <div className="container mx-auto px-4">
          <h1 className="animate-fade-in text-center text-3xl font-bold text-primary-foreground md:text-4xl">
            CA Mentorship Program
          </h1>
          <p className="animate-fade-in mt-2 text-center text-primary-foreground/80" style={{ animationDelay: '0.2s' }}>
            Structured planning, personalized support, and continuous mentorship to help you succeed.
          </p>
        </div>
      </div>

      <div className="bg-background">
        <div className="container mx-auto px-4 py-8">
          <section className="animate-fade-in mb-12" style={{ animationDelay: '0.3s' }}>
            <p className="mx-auto max-w-4xl text-center text-muted-foreground">
              Our CA Mentorship Program is carefully designed to provide structured planning, personalized academic support,
              and continuous mentorship to help students stay focused, confident, and exam-ready throughout their attempt.
              Whether you are looking for basic academic direction or intensive one-to-one mentorship, we offer flexible
              plans suited to every CA aspirant&apos;s needs.
            </p>
          </section>

          <section className="mb-12 grid gap-8 md:grid-cols-3">
            {plans.map((plan, index) => (
              <article
                key={plan._id}
                className="plan-card animate-slide-in-up group flex flex-col rounded-xl border border-border bg-card shadow-md transition-all duration-300"
                style={{ animationDelay: `${index * 0.2 + 0.4}s` }}
              >
                <div className="p-6">
                  <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold text-foreground transition-colors group-hover:text-primary">
                    {planIconMap[plan.tier]}
                    {plan.title}
                  </h2>
                  <p className="mb-4 text-3xl font-bold text-primary">
                    {inrFormatter.format(plan.price)}
                    <span className="text-lg font-normal text-muted-foreground"> / Attempt</span>
                  </p>
                  <p className="mb-6 text-muted-foreground">{plan.bestFor}</p>
                  <ul className="list-disc space-y-3 pl-5 text-foreground">
                    {plan.features.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                </div>
                <div className="mt-auto p-6">
                  <Button
                    onClick={() => handleBuyNow(plan)}
                    disabled={processingPlanId === plan._id}
                    className="btn-primary w-full py-6 text-lg transition-colors group-hover:bg-primary/90"
                  >
                    {processingPlanId === plan._id ? 'Processing...' : 'Buy Now'}
                  </Button>
                </div>
              </article>
            ))}
          </section>

          <section className="animate-slide-in-up mb-12" style={{ animationDelay: '0.8s' }}>
            <h2 className="mb-6 text-center text-3xl font-bold text-foreground">How It Works</h2>
            <div className="grid gap-8 text-center md:grid-cols-3">
              <div className="flex flex-col items-center">
                <div className="icon-container mb-4 rounded-full bg-primary/10 p-4 transition-transform duration-300">
                  <Users className="text-primary" size={32} />
                </div>
                <h3 className="mb-2 text-xl font-semibold text-foreground">1. Choose Your Plan</h3>
                <p className="text-muted-foreground">Select the mentorship plan that best fits your learning style and goals.</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="icon-container mb-4 rounded-full bg-primary/10 p-4 transition-transform duration-300">
                  <BookOpen className="text-primary" size={32} />
                </div>
                <h3 className="mb-2 text-xl font-semibold text-foreground">2. Start Learning</h3>
                <p className="text-muted-foreground">
                  Get your personalized study planner and start your preparation with our expert guidance.
                </p>
              </div>
              <div className="flex flex-col items-center">
                <div className="icon-container mb-4 rounded-full bg-primary/10 p-4 transition-transform duration-300">
                  <TrendingUp className="text-primary" size={32} />
                </div>
                <h3 className="mb-2 text-xl font-semibold text-foreground">3. Track Your Progress</h3>
                <p className="text-muted-foreground">
                  Receive regular feedback and track your performance to stay on the path to success.
                </p>
              </div>
            </div>
          </section>

          <section className="animate-slide-in-up mb-12" style={{ animationDelay: '1s' }}>
            <h2 className="mb-6 text-center text-3xl font-bold text-foreground">Why Choose Our CA Mentorship Program?</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[
                { text: 'Well-structured and exam-oriented study planning', icon: <BookOpen /> },
                { text: 'Guidance from experienced CA mentors and academic experts', icon: <Users /> },
                { text: 'Personalized mentoring tailored to individual student needs', icon: <Smile /> },
                { text: 'Regular performance analysis with actionable feedback', icon: <TrendingUp /> },
                { text: 'Strong accountability system to maintain consistency', icon: <ShieldCheck /> },
                { text: 'End-to-end academic support till CA examinations', icon: <HelpCircle /> },
              ].map((item) => (
                <div
                  key={item.text}
                  className="flex items-center gap-4 rounded-lg border border-border bg-card p-4 text-foreground transition-transform duration-300 hover:scale-105"
                >
                  <div className="text-primary">{item.icon}</div>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="animate-slide-in-up mb-12" style={{ animationDelay: '1.2s' }}>
            <h2 className="mb-6 text-center text-3xl font-bold text-foreground">Compare CA Mentorship Plans</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full rounded-xl border border-border bg-card">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Features / Benefits</th>
                    <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Basic Plan</th>
                    <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Golden Plan</th>
                    <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Platinum Plan</th>
                  </tr>
                </thead>
                <tbody className="text-foreground">
                  {[
                    { feature: 'Price (per attempt)', basic: 'INR 1,499', golden: 'INR 2,999', platinum: 'INR 4,999' },
                    {
                      feature: 'Study Planner',
                      basic: 'Basic study planner',
                      golden: 'Personalized study planner',
                      platinum: 'Fully personalized and dynamic planner',
                    },
                    {
                      feature: 'Mentor Allocation',
                      basic: 'Mentor for doubt discussions',
                      golden: 'Dedicated one-to-one mentor (limited support)',
                      platinum: 'Dedicated one-to-one mentor (continuous support)',
                    },
                    {
                      feature: 'Academic Guidance',
                      basic: 'Expert guidance throughout attempt',
                      golden: 'Expert guidance with weekly support',
                      platinum: 'Intensive expert guidance with priority access',
                    },
                    {
                      feature: 'Doubt Solving',
                      basic: 'Personal doubt-solving group',
                      golden: 'Group and mentor support',
                      platinum: 'Priority doubt-solving with faster resolution',
                    },
                    {
                      feature: 'Performance Evaluation',
                      basic: 'Once within 10 days',
                      golden: 'Regular review',
                      platinum: 'Twice-weekly expert evaluation',
                    },
                    { feature: 'Progress Tracking', basic: 'Basic tracking', golden: 'Weekly tracking', platinum: 'Twice-weekly tracking' },
                    {
                      feature: 'Test Series',
                      basic: 'Not included',
                      golden: 'Any 3 papers (complimentary)',
                      platinum: '5 papers (complimentary)',
                    },
                    { feature: 'Level of Personalization', basic: 'Low', golden: 'Medium', platinum: 'High' },
                    { feature: 'Support Till Exams', basic: 'Yes', golden: 'Yes', platinum: 'Yes (priority support)' },
                  ].map((item) => (
                    <tr key={item.feature} className="border-t border-border">
                      <td className="px-4 py-3">{item.feature}</td>
                      <td className="px-4 py-3 text-center">{item.basic}</td>
                      <td className="px-4 py-3 text-center">{item.golden}</td>
                      <td className="px-4 py-3 text-center">{item.platinum}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="animate-slide-in-up mb-12" style={{ animationDelay: '1.4s' }}>
            <h2 className="mb-6 text-center text-3xl font-bold text-foreground">Need Help Choosing the Right Plan?</h2>
            <div className="grid gap-8 text-center text-muted-foreground md:grid-cols-3">
              <div>
                <h3 className="mb-2 text-xl font-semibold text-foreground">Basic Plan</h3>
                <p>Choose Basic if you are self-disciplined and need structured guidance with expert support.</p>
              </div>
              <div>
                <h3 className="mb-2 text-xl font-semibold text-foreground">Golden Plan</h3>
                <p>Choose Golden if you want personalized planning and regular mentor interaction.</p>
              </div>
              <div>
                <h3 className="mb-2 text-xl font-semibold text-foreground">Platinum Plan</h3>
                <p>Choose Platinum if you need intensive, continuous, and priority mentorship for maximum performance.</p>
              </div>
            </div>
          </section>

          <section className="animate-slide-in-up mb-12" style={{ animationDelay: '1.6s' }}>
            <h2 className="mb-6 text-center text-3xl font-bold text-foreground">Frequently Asked Questions</h2>
            <Accordion type="single" collapsible className="mx-auto w-full max-w-3xl">
              {faqItems.map((item, index) => (
                <AccordionItem value={`item-${index}`} key={item.question}>
                  <AccordionTrigger>{item.question}</AccordionTrigger>
                  <AccordionContent>{item.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        </div>
      </div>

      {/* Paper Selector Modal */}
      {selectedPlan && (
        <MentorshipPaperSelector
          isOpen={showPaperSelector}
          planName={selectedPlan.title}
          maxPapers={getPaperLimit(selectedPlan.tier)}
          onClose={() => {
            setShowPaperSelector(false);
            setSelectedPlan(null);
            setSelectedPapers([]);
          }}
          onConfirm={handlePaperConfirm}
          isLoading={processingPlanId === selectedPlan._id}
        />
      )}
    </Layout>
  );
};

export default MentorshipPage;
