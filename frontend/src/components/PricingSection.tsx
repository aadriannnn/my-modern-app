
import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { CheckCircle2, ChevronRight, Loader2, AlertCircle, CreditCard, Clock, ShieldCheck } from 'lucide-react';
import {
    EmbeddedCheckoutProvider,
    EmbeddedCheckout
} from '@stripe/react-stripe-js';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// --- Types ---
interface SubscriptionFeature {
    name: string;
    details: string | null;
}

interface SubscriptionPlan {
    id: string;
    name: string;
    price: number;
    currency: string;
    interval: string;
    points_granted: number;
    features: SubscriptionFeature[];
    is_popular: boolean;
    discount_percentage: number | null;
    is_customizable: boolean;
    stripe_price_id: string | null;
    cta_text: string;
    cta_link: string | null;
    is_free: boolean;
}

interface SubscriptionPageData {
    plans: SubscriptionPlan[];
}

interface CreateCheckoutSessionResponse {
    clientSecret: string | null;
    billingData: any;
}

// Initialize Stripe outside component
// Make sure to use the Test Public Key for dev
const stripePromise = loadStripe('pk_test_51RLSPc2NYfTY9eAfHglgYcLiUzUR5OVoz4icibICe0CxAs2B6mRUixjrLvjQzwjvjkpAWWvm1W3OOQ7et5hGM9ha00Yb8zUav8');

const PricingSection: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [showCheckout, setShowCheckout] = useState(false);
    const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
    const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);

    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/billing/plans`);
            if (!response.ok) throw new Error('Nu s-au putut încărca planurile.');
            const data: SubscriptionPageData = await response.json();
            setPlans(data.plans || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSubscribe = async (plan: SubscriptionPlan) => {
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }

        if (!plan.stripe_price_id) return; // Free plan or link only

        try {
            setProcessingPlanId(plan.id);
            setError(null);

            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/billing/create-checkout-session`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ stripe_price_id: plan.stripe_price_id })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Eroare la inițierea plății.');
            }

            const data: CreateCheckoutSessionResponse = await response.json();
            if (data.clientSecret) {
                setClientSecret(data.clientSecret);
                setSelectedPlanId(plan.id);
                setShowCheckout(true);
            } else {
                throw new Error("Nu s-a putut genera sesiunea de plată.");
            }

        } catch (err: any) {
            setError(err.message || "A apărut o eroare neașteptată.");
        } finally {
            setProcessingPlanId(null);
        }
    };

    const validPlans = plans.filter(p => p.id !== 'personalizeaza' && p.id !== 'inscriere');

    if (showCheckout && clientSecret) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden max-w-4xl mx-auto my-8">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-blue-600" />
                        Finalizare Plată - {plans.find(p => p.id === selectedPlanId)?.name}
                    </h3>
                    <button
                        onClick={() => { setShowCheckout(false); setClientSecret(null); }}
                        className="text-sm text-slate-500 hover:text-slate-800 font-medium px-3 py-1 rounded-lg hover:bg-slate-200 transition-colors"
                    >
                        Anulează
                    </button>
                </div>
                <div className="p-6">
                    <EmbeddedCheckoutProvider
                        stripe={stripePromise}
                        options={{ clientSecret }}
                    >
                        <EmbeddedCheckout />
                    </EmbeddedCheckoutProvider>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="text-center mb-12">
                <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">Alege Planul Potrivit</h2>
                <p className="mt-4 text-xl text-slate-600">
                    Soluții flexibile pentru orice nevoie juridică. Upgradează pentru acces nelimitat.
                </p>
            </div>

            {error && (
                <div className="mb-6 bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl flex items-center gap-3 max-w-2xl mx-auto">
                    <AlertCircle className="w-5 h-5" />
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {validPlans.map((plan) => (
                    <div
                        key={plan.id}
                        className={`relative rounded-2xl p-8 border transition-all duration-300 flex flex-col ${plan.is_popular
                                ? 'border-blue-200 bg-blue-50/30 shadow-xl scale-105 z-10 ring-1 ring-blue-100'
                                : 'border-slate-200 bg-white hover:border-blue-200 hover:shadow-lg'
                            }`}
                    >
                        {plan.is_popular && (
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-bold px-4 py-1.5 rounded-full shadow-lg">
                                POPULAR
                            </div>
                        )}

                        <div className="mb-6">
                            <h3 className="text-xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                            <div className="flex items-baseline gap-1">
                                <span className="text-4xl font-extrabold text-slate-900">{plan.price}</span>
                                <span className="text-md font-medium text-slate-500">{plan.currency} / {plan.interval}</span>
                            </div>
                        </div>

                        <ul className="space-y-4 mb-8 flex-1">
                            {plan.features.map((feature, idx) => (
                                <li key={idx} className="flex items-start gap-3 text-sm">
                                    <CheckCircle2 className={`w-5 h-5 shrink-0 ${plan.is_popular ? 'text-blue-600' : 'text-green-500'}`} />
                                    <span className="text-slate-700">
                                        <span className="font-medium">{feature.name}</span>
                                        {feature.details && <span className="text-slate-500 block text-xs mt-0.5">{feature.details}</span>}
                                    </span>
                                </li>
                            ))}
                        </ul>

                        <button
                            onClick={() => handleSubscribe(plan)}
                            disabled={!!processingPlanId}
                            className={`w-full py-4 px-6 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-base ${plan.is_popular
                                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl hover:-translate-y-0.5'
                                    : 'bg-slate-900 text-white hover:bg-slate-800 shadow-md hover:shadow-lg'
                                }`}
                        >
                            {processingPlanId === plan.id ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    {plan.cta_text}
                                    <ChevronRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </div>
                ))}
            </div>

            <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-slate-500">
                <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-slate-400" />
                    Plată Securizată Stripe
                </div>
                <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-slate-400" />
                    Garantat 30 zile
                </div>
                <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-slate-400" />
                    Activare Instantanee
                </div>
            </div>
        </div>
    );
};

export default PricingSection;
