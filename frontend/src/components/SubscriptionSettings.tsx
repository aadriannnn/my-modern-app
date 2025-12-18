
import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { CheckCircle2, ChevronRight, Loader2, AlertCircle, RefreshCw, CreditCard, Clock, ShieldCheck } from 'lucide-react';
import {
    EmbeddedCheckoutProvider,
    EmbeddedCheckout
} from '@stripe/react-stripe-js';

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

const SubscriptionSettings: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [showCheckout, setShowCheckout] = useState(false);
    const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
    const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);

    // Portal loading state
    const [portalLoading, setPortalLoading] = useState(false);

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/billing/plans');
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
        if (!plan.stripe_price_id) return; // Free plan or link only

        try {
            setProcessingPlanId(plan.id);
            setError(null);

            // Get token for auth header
            // Assuming token is stored in localStorage 'token' or via cookie logic.
            // Since this component is inside SettingsPage which handles auth check,
            // we assume connection handles cookies (secure=False for localhost)

            const response = await fetch('/api/billing/create-checkout-session', {
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

    const handleBillingPortal = async () => {
        try {
            setPortalLoading(true);
            const response = await fetch('/api/billing/create-billing-portal-session', {
                method: 'POST'
            });
            if (!response.ok) throw new Error("Nu s-a putut deschide portalul.");
            const data = await response.json();
            if (data.url) {
                window.location.href = data.url;
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setPortalLoading(false);
        }
    }

    if (showCheckout && clientSecret) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
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
        <div className="space-y-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 mb-1">Abonament & Facturare</h2>
                        <p className="text-slate-500 text-sm">Gestionează planul tău și vezi istoricul plăților.</p>
                    </div>
                    <button
                        onClick={handleBillingPortal}
                        disabled={portalLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 hover:text-blue-600 transition-colors font-medium text-sm shadow-sm"
                    >
                        {portalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        Portal Client Stripe
                    </button>
                </div>

                {error && (
                    <div className="mb-6 bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl flex items-center gap-3">
                        <AlertCircle className="w-5 h-5" />
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {validPlans.map((plan) => (
                        <div
                            key={plan.id}
                            className={`relative rounded-2xl p-6 border transition-all duration-300 ${plan.is_popular
                                ? 'border-blue-200 bg-blue-50/50 shadow-md scale-100 ring-1 ring-blue-100'
                                : 'border-slate-200 bg-white hover:border-blue-200 hover:shadow-sm'
                                }`}
                        >
                            {plan.is_popular && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                                    POPULAR
                                </div>
                            )}

                            <h3 className="text-lg font-bold text-slate-900 mb-2">{plan.name}</h3>
                            <div className="flex items-baseline gap-1 mb-4">
                                <span className="text-3xl font-extrabold text-slate-900">{plan.price}</span>
                                <span className="text-sm font-medium text-slate-500">{plan.currency} / {plan.interval}</span>
                            </div>

                            <ul className="space-y-3 mb-8 min-h-[160px]">
                                {plan.features.map((feature, idx) => (
                                    <li key={idx} className="flex items-start gap-3 text-sm">
                                        <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                                        <span className="text-slate-600">
                                            {feature.name} {feature.details && <span className="text-slate-400">({feature.details})</span>}
                                        </span>
                                    </li>
                                ))}
                            </ul>

                            <button
                                onClick={() => handleSubscribe(plan)}
                                disabled={!!processingPlanId}
                                className={`w-full py-3 px-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${plan.is_popular
                                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200 hover:shadow-lg hover:-translate-y-0.5'
                                    : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                                    }`}
                            >
                                {processingPlanId === plan.id ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        {plan.cta_text}
                                        <ChevronRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </div>
                    ))}
                </div>

                <div className="mt-8 flex items-center justify-center gap-6 text-slate-400 text-sm">
                    <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        Plată Securizată Stripe
                    </div>
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4" />
                        Garantat 30 zile
                    </div>
                    <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Activare Instantanee
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SubscriptionSettings;
