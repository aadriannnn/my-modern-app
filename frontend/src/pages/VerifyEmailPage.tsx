import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Check, X, Loader2 } from 'lucide-react';

const VerifyEmailPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { login } = useAuth();
    const token = searchParams.get('token');
    const calledOnce = useRef(false);

    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('Token invalid sau lipsă.');
            return;
        }

        if (calledOnce.current) return;
        calledOnce.current = true;

        const verify = async () => {
            try {
                const res = await fetch(`/api/auth/verify-email?token=${token}`, {
                    method: 'POST',
                });

                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.detail || 'Verificare eșuată');
                }

                // Backend logs user in via cookie. We need to update context.
                login(data);
                setStatus('success');
                setMessage('Email verificat cu succes! Te redirecționăm...');

                setTimeout(() => {
                    navigate('/');
                }, 3000);

            } catch (err: any) {
                setStatus('error');
                setMessage(err.message || 'A apărut o eroare la verificarea emailului.');
            }
        };

        verify();
    }, [token, login, navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
            <div className="max-w-md w-full bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 text-center">
                {status === 'loading' && (
                    <div className="flex flex-col items-center">
                        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Verificăm emailul...</h2>
                    </div>
                )}

                {status === 'success' && (
                    <div className="flex flex-col items-center">
                        <div className="flex items-center justify-center h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-6">
                            <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Succes!</h2>
                        <p className="text-gray-600 dark:text-gray-300 mb-6">
                            {message}
                        </p>
                        <Link to="/" className="text-blue-600 hover:underline">
                            Mergi la prima pagină
                        </Link>
                    </div>
                )}

                {status === 'error' && (
                    <div className="flex flex-col items-center">
                        <div className="flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-6">
                            <X className="h-8 w-8 text-red-600 dark:text-red-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Eroare</h2>
                        <p className="text-gray-600 dark:text-gray-300 mb-6">
                            {message}
                        </p>
                        <Link to="/login" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                            Înapoi la Autentificare
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VerifyEmailPage;
