
import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { CheckCircle2, ChevronRight, Loader2, AlertCircle, CreditCard, Clock, ShieldCheck, Star, Sparkles, AlertTriangle, Lock } from 'lucide-react';
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
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }

        // For free plan, redirect to register
        if (plan.cta_link) {
            navigate(plan.cta_link);
            return;
        }

        if (!plan.stripe_price_id) return;

        try {
            setProcessingPlanId(plan.id);
            setError(null);

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

    // Separate plans
    const basicPlan = plans.find(p => p.id === 'basic');
    const premiumPlans = plans.filter(p => p.id.startsWith('premium_'));

    return (
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            {/* Hero Section */}
            <div className="text-center mb-16">
                <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4">
                    Alegeți Planul Potrivit
                </h2>
                <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                    Accesați cea mai completă bază de jurisprudență românească.
                    Începeți gratuit sau deblocați toate funcțiile Premium.
                </p>
            </div>

            {error && (
                <div className="mb-6 bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl flex items-center gap-3 max-w-2xl mx-auto">
                    <AlertCircle className="w-5 h-5" />
                    {error}
                </div>
            )}

            {/* Unregistered User Notice */}
            {!isAuthenticated && (
                <div className="mb-12 bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-yellow-300 rounded-2xl p-8 max-w-4xl mx-auto shadow-lg">
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                            <AlertTriangle className="w-10 h-10 text-yellow-600" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-2xl font-bold text-gray-900 mb-3">
                                Vizitator Neinregistrat
                            </h3>
                            <p className="text-gray-700 mb-6">
                                Momentan explorați platforma fără cont. Beneficiile sunt foarte limitate.
                            </p>

                            <div className="grid md:grid-cols-2 gap-6 mb-6">
                                {/* What you CAN do */}
                                <div className="bg-white/60 rounded-xl p-4 border border-green-200">
                                    <h4 className="font-bold text-green-700 mb-3 flex items-center gap-2">
                                        <CheckCircle2 className="w-5 h-5" />
                                        Ce puteți face
                                    </h4>
                                    <ul className="space-y-2 text-sm text-gray-700">
                                        <li className="flex items-start gap-2">
                                            <span className="text-green-600 mt-0.5">•</span>
                                            <span>Vizualizare prezentare platformă</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-green-600 mt-0.5">•</span>
                                            <span>Consultare planuri de abonament</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-green-600 mt-0.5">•</span>
                                            <span>Acces la politica de confidențialitate</span>
                                        </li>
                                    </ul>
                                </div>

                                {/* What you CANNOT do */}
                                <div className="bg-white/60 rounded-xl p-4 border border-red-200">
                                    <h4 className="font-bold text-red-700 mb-3 flex items-center gap-2">
                                        <Lock className="w-5 h-5" />
                                        Fără acces la
                                    </h4>
                                    <ul className="space-y-2 text-sm text-gray-700">
                                        <li className="flex items-start gap-2">
                                            <span className="text-red-600 mt-0.5">✗</span>
                                            <span>Căutare în baza de jurisprudență</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-red-600 mt-0.5">✗</span>
                                            <span>Vizualizare spețe și hotărâri</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-red-600 mt-0.5">✗</span>
                                            <span>Salvare rezultate și dosar virtual</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-red-600 mt-0.5">✗</span>
                                            <span>Funcții AI și instrumente avansate</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            <button
                                onClick={() => navigate('/register')}
                                className="w-full md:w-auto bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-4 px-8 rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                            >
                                <Star className="w-5 h-5" />
                                Creează Cont Gratuit Acum
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Basic Plan Section - Only for Unregistered Users */}
            {!isAuthenticated && basicPlan && (
                <div className="mb-16">
                    <div className="text-center mb-8">
                        <h3 className="text-3xl font-bold text-slate-900 mb-2">Începeți Gratuit</h3>
                        <p className="text-slate-600">Perfect pentru a explora platforma</p>
                    </div>
                    <div className="max-w-2xl mx-auto">
                        <div className="bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-300 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all">
                            <div className="text-center mb-6">
                                <h4 className="text-2xl font-bold text-slate-900 mb-2">{basicPlan.name}</h4>
                                <div className="flex items-baseline justify-center gap-2">
                                    <span className="text-5xl font-extrabold text-slate-900">{basicPlan.price}</span>
                                    <span className="text-2xl font-semibold text-slate-600">{basicPlan.currency}</span>
                                </div>
                                <p className="text-slate-600 mt-2">Valabil permanent</p>
                            </div>

                            <ul className="space-y-3 mb-8">
                                {basicPlan.features.map((feature, idx) => (
                                    <li key={idx} className="flex items-start gap-3">
                                        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                        <div className="flex-1">
                                            <span className="font-semibold text-slate-800">{feature.name}</span>
                                            {feature.details && <span className="text-slate-600 text-sm block">{feature.details}</span>}
                                        </div>
                                    </li>
                                ))}
                            </ul>

                            <button
                                onClick={() => navigate('/register')}
                                className="w-full bg-slate-700 hover:bg-slate-800 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                            >
                                {basicPlan.cta_text}
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Premium Plans Section */}
            {premiumPlans.length > 0 && (
                <div>
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-full font-bold mb-4">
                            <Sparkles className="w-5 h-5" />
                            Premium
                        </div>
                        <h3 className="text-3xl font-bold text-slate-900 mb-2">Deblocați Puterea Completă</h3>
                        <p className="text-slate-600 max-w-2xl mx-auto">
                            Acces nelimitat, funcții AI avansate, și toate instrumentele profesionale pentru practicienii dreptului
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12 items-stretch">
                        {premiumPlans.map((plan) => (
                            <div
                                key={plan.id}
                                className={`relative rounded-2xl p-8 border-2 transition-all duration-300 flex flex-col h-full ${plan.is_popular
                                    ? 'border-blue-400 bg-blue-50/50 shadow-2xl md:scale-105 z-10 ring-2 ring-blue-200'
                                    : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-xl'
                                    }`}
                            >
                                {plan.is_popular && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-bold px-6 py-2 rounded-full shadow-lg whitespace-nowrap">
                                        CEL MAI POPULAR
                                    </div>
                                )}

                                {plan.discount_percentage && plan.discount_percentage > 0 && (
                                    <div className="absolute -top-3 -right-3 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg transform rotate-12 whitespace-nowrap">
                                        Economie {plan.discount_percentage}%
                                    </div>
                                )}

                                <div className="mb-6">
                                    <h4 className="text-xl font-bold text-slate-900 mb-3">{plan.name}</h4>
                                    <div className="flex items-baseline gap-2 mb-2">
                                        <span className="text-4xl md:text-5xl font-extrabold text-slate-900">{plan.price}</span>
                                        <span className="text-lg font-semibold text-slate-600">{plan.currency}</span>
                                    </div>
                                    <p className="text-slate-600 text-sm">
                                        {plan.interval === 'Lună' && 'Facturat lunar'}
                                        {plan.interval === '6 Luni' && `${(plan.price / 6).toFixed(0)} RON/lună`}
                                        {plan.interval === 'An' && `${(plan.price / 12).toFixed(0)} RON/lună`}
                                    </p>
                                </div>

                                <ul className="space-y-3 mb-6 flex-1">
                                    {plan.features.map((feature, idx) => (
                                        <li key={idx} className="flex items-start gap-3 text-sm">
                                            <CheckCircle2 className={`w-5 h-5 flex-shrink-0 mt-0.5 ${plan.is_popular ? 'text-blue-600' : 'text-green-600'}`} />
                                            <div className="flex-1">
                                                <span className="font-semibold text-slate-800">{feature.name}</span>
                                                {feature.details && <span className="text-slate-600 text-xs block mt-0.5">{feature.details}</span>}
                                            </div>
                                        </li>
                                    ))}
                                </ul>

                                <button
                                    onClick={() => handleSubscribe(plan)}
                                    disabled={!!processingPlanId}
                                    className={`w-full py-4 px-6 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-base mt-auto ${plan.is_popular
                                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl hover:-translate-y-0.5'
                                        : 'bg-slate-800 text-white hover:bg-slate-900 shadow-md hover:shadow-lg'
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
                </div>
            )}

            {/* Trust Badges */}
            <div className="mt-16 flex flex-wrap items-center justify-center gap-12 text-slate-500 border-t border-slate-200 pt-12">
                <div className="flex items-center gap-3">
                    <CreditCard className="w-6 h-6 text-slate-400" />
                    <span className="font-medium">Plată Securizată Stripe</span>
                </div>
                <div className="flex items-center gap-3">
                    <ShieldCheck className="w-6 h-6 text-slate-400" />
                    <span className="font-medium">Garanție 30 Zile</span>
                </div>
                <div className="flex items-center gap-3">
                    <Clock className="w-6 h-6 text-slate-400" />
                    <span className="font-medium">Activare Instantanee</span>
                </div>
            </div>
        </div>
    );
};

export default PricingSection;
