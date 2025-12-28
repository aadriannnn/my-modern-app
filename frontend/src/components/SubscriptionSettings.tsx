import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { CheckCircle2, ChevronRight, Loader2, AlertCircle, RefreshCw, CreditCard, ShieldCheck, Shield, Calendar, ArrowLeft, XCircle } from 'lucide-react';
import {
    EmbeddedCheckoutProvider,
    EmbeddedCheckout
} from '@stripe/react-stripe-js';
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

const SubscriptionSettings: React.FC = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false); // Initial loading for plans only if needed
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [showCheckout, setShowCheckout] = useState(false);
    const [showPlans, setShowPlans] = useState(false); // Toggle to show plans
    const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
    const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);

    // Portal loading state
    const [portalLoading, setPortalLoading] = useState(false);

    // Cancellation state
    const [cancelling, setCancelling] = useState(false);
    const [cancelSuccess, setCancelSuccess] = useState(false);

    // Fetch plans only when user wants to see them (or pre-fetch)
    useEffect(() => {
        if (showPlans && plans.length === 0) {
            fetchPlans();
        }
    }, [showPlans]);

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

    const handleCancelSubscription = async () => {
        if (!window.confirm("Ești sigur că vrei să anulezi abonamentul? Vei pierde accesul la beneficiile Premium la finalul perioadei curente.")) {
            return;
        }

        try {
            setCancelling(true);
            const response = await fetch('/api/billing/subscription/cancel', {
                method: 'POST'
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || "Nu s-a putut anula abonamentul.");
            }

            setCancelSuccess(true);
            // Refresh page after short delay to show updated status
            setTimeout(() => {
                window.location.reload();
            }, 2000);

        } catch (err: any) {
            setError(err.message || "A apărut o eroare la anularea abonamentului.");
        } finally {
            setCancelling(false);
        }
    };

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
    };

    // Helper to format date
    const formatDate = (dateString?: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('ro-RO', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    // Helper for role display
    const getRoleDetails = (role: string) => {
        switch (role) {
            case 'admin':
                return { label: 'Administrator', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: Shield };
            case 'pro':
                return { label: 'Premium (Pro)', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Shield };
            default:
                return { label: 'Basic (Gratuit)', color: 'bg-slate-100 text-slate-700 border-slate-200', icon: Shield };
        }
    };

    if (!user) return null;

    const validPlans = plans.filter(p => p.id !== 'personalizeaza' && p.id !== 'inscriere');
    const roleInfo = getRoleDetails(user.rol);
    const Icon = roleInfo.icon;

    // --- RENDER CHECKOUT ---
    if (showCheckout && clientSecret) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <button
                        onClick={() => { setShowCheckout(false); setClientSecret(null); }}
                        className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 font-medium px-3 py-2 rounded-lg hover:bg-slate-200 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Înapoi
                    </button>
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-blue-600" />
                        Finalizare Plată - {plans.find(p => p.id === selectedPlanId)?.name}
                    </h3>
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

    // --- RENDER PLANS SELECTION ---
    if (showPlans) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => setShowPlans(false)}
                        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Înapoi la Profil
                    </button>
                    <h2 className="text-xl font-bold text-slate-900">Alege Planul Premium</h2>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                    </div>
                ) : (
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
                )}
            </div>
        );
    }

    // --- RENDER STATUS VIEW (DEFAULT) ---
    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 mb-1 flex items-center gap-2">
                            <CreditCard className="w-6 h-6 text-blue-600" />
                            Status Abonament
                        </h2>
                        <p className="text-slate-500 text-sm">Informații despre planul tău curent.</p>
                    </div>
                </div>

                {error && (
                    <div className="mb-6 bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl flex items-center gap-3">
                        <AlertCircle className="w-5 h-5" />
                        {error}
                    </div>
                )}

                {cancelSuccess && (
                    <div className="mb-6 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-xl flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5" />
                        Abonamentul a fost anulat cu succes. Accesul rămâne activ până la expirare.
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Status Card */}
                    <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full translate-x-12 -translate-y-12 opacity-50 blur-2xl"></div>

                        <div className="relative z-10 space-y-6">
                            <div>
                                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Tip Abonament</h3>
                                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${roleInfo.color}`}>
                                    <Icon className="w-4 h-4" />
                                    <span className="font-bold">{roleInfo.label}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        Dată Activare
                                    </h3>
                                    <p className="text-lg font-medium text-slate-900">
                                        {formatDate(user.dataCreare)}
                                    </p>
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        Dată Expirare
                                    </h3>
                                    <p className="text-lg font-medium text-slate-900">
                                        {user.rol === 'basic' ? 'Nelimitat' : 'Se reînnoiește automat'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col justify-center space-y-4">
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
                            <h4 className="font-bold mb-1 flex items-center gap-2">
                                <Shield className="w-4 h-4" />
                                {user.rol === 'basic' ? 'Treci la Premium?' : 'Status Abonament'}
                            </h4>
                            <p className="opacity-90">
                                {user.rol === 'basic'
                                    ? 'Obține acces nelimitat, analiză AI avansată și suport prioritar.'
                                    : 'Beneficiezi de toate funcționalitățile PRO active.'
                                }
                            </p>
                        </div>

                    </div>

                    {user.rol === 'basic' && (
                        <button
                            onClick={() => setShowPlans(true)}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-200 hover:-translate-y-0.5"
                        >
                            <UpgradeIcon className="w-5 h-5" />
                            Vezi Planurile Premium
                        </button>
                    )}

                    {user.rol === 'admin' && (
                        <button
                            onClick={handleBillingPortal}
                            disabled={portalLoading}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg hover:-translate-y-0.5"
                        >
                            {portalLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <RefreshCw className="w-5 h-5" />
                            )}
                            Portal Stripe (Admin)
                        </button>
                    )}

                    {user.rol === 'pro' && !user.subscription_cancelled_at && (
                        <div className="space-y-3">
                            <div className="w-full py-3.5 px-4 rounded-xl border border-green-200 bg-green-50 text-green-700 font-semibold flex items-center justify-center gap-2">
                                <CheckCircle2 className="w-5 h-5" />
                                Abonament Activ
                            </div>
                            <button
                                onClick={handleCancelSubscription}
                                disabled={cancelling}
                                className="w-full py-3 px-4 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 font-medium transition-colors flex items-center justify-center gap-2 text-sm"
                            >
                                {cancelling ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <XCircle className="w-4 h-4" />
                                )}
                                Dezabonează-te
                            </button>
                            <p className="text-xs text-center text-slate-500">
                                Poți anula oricând. Vei păstra accesul până la următoarea dată de facturare.
                            </p>
                        </div>
                    )}

                    {user.rol === 'pro' && user.subscription_cancelled_at && (
                        <div className="w-full py-3.5 px-4 rounded-xl border border-yellow-200 bg-yellow-50 text-yellow-800 font-semibold flex flex-col items-center justify-center gap-1 text-center">
                            <div className="flex items-center gap-2">
                                <AlertCircle className="w-5 h-5" />
                                Anulare Programată
                            </div>
                            <span className="text-xs font-normal opacity-80">
                                Acces valid până la {formatDate(user.pro_status_active_until || user.subscription_end_date)}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-8 flex items-center justify-center gap-6 text-slate-400 text-sm">
                <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Plată Securizată Stripe
                </div>
                <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" />
                    Garantie 30 zile
                </div>
            </div>
        </div>

    );
};

const UpgradeIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
);

export default SubscriptionSettings;
