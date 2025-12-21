
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, ArrowRight } from 'lucide-react';

const PaymentReturnPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState<'loading' | 'success' | 'canceled' | 'error'>('loading');
    const [customerEmail, setCustomerEmail] = useState<string | null>(null);

    const sessionId = searchParams.get('session_id');

    useEffect(() => {
        if (!sessionId) {
            setStatus('error');
            return;
        }

        const fetchSessionStatus = async () => {
            try {
                const response = await fetch(`/api/billing/session-status?session_id=${sessionId}`);
                const data = await response.json();

                if (data.status === 'open') {
                    // Payment not finished
                    setStatus('loading'); // or redirect back
                    return;
                }

                if (data.status === 'complete' || data.status === 'paid') {
                    setStatus('success');
                    setCustomerEmail(data.customer_email);
                } else {
                    setStatus('canceled'); // default fallback
                }
            } catch (error) {
                console.error("Error fetching session status:", error);
                setStatus('error');
            }
        };

        fetchSessionStatus();
    }, [sessionId]);

    if (status === 'loading') {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                <h2 className="text-xl font-semibold text-slate-800">Verificăm statusul plății...</h2>
            </div>
        );
    }

    if (status === 'success') {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center animate-in fade-in zoom-in duration-300">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-10 h-10 text-green-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Plată reușită!</h1>
                    <p className="text-slate-600 mb-8">
                        Mulțumim pentru abonament{customerEmail ? `, ${customerEmail}` : ''}. Contul tău a fost actualizat la statusul PRO.
                    </p>
                    <button
                        onClick={() => navigate('/setari')}
                        className="w-full py-3.5 px-6 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
                    >
                        Înapoi la Setări
                        <ArrowRight className="w-5 h-5" />
                    </button>
                    <p className="text-xs text-slate-400 mt-6">
                        Vei primi factura pe email în scurt timp.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <XCircle className="w-10 h-10 text-red-600" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Plată anulată sau eșuată</h1>
                <p className="text-slate-600 mb-8">
                    Nu am putut procesa plata. Te rugăm să încerci din nou sau să folosești un alt card.
                </p>
                <div className="space-y-3">
                    <button
                        onClick={() => navigate('/setari')}
                        className="w-full py-3 px-6 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors"
                    >
                        Înapoi la Setări
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PaymentReturnPage;
