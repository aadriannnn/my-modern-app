import React from 'react';
import { User, Mail, Shield, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ProfileSettings: React.FC = () => {
    const { user, logout } = useAuth();

    if (!user) return null;

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <User className="w-6 h-6 text-blue-600" />
                    Informații Profil
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* User Avatar & Basic Info */}
                    <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="w-24 h-24 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-3xl font-bold mb-4">
                            {user.numeComplet ? user.numeComplet.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">{user.numeComplet || 'Utilizator'}</h3>
                        <p className="text-slate-500">{user.email}</p>
                        <span className={`mt-3 px-3 py-1 rounded-full text-xs font-semibold ${user.rol === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                            {user.rol === 'admin' ? 'Administrator' : 'Utilizator Standard'}
                        </span>
                    </div>

                    {/* Detailed Info */}
                    <div className="space-y-4">
                        <div className="p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-200 transition-colors">
                            <div className="flex items-center gap-3 mb-1">
                                <Mail className="w-4 h-4 text-slate-400" />
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email</span>
                            </div>
                            <div className="font-medium text-slate-900 ml-7">{user.email}</div>
                        </div>

                        <div className="p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-200 transition-colors">
                            <div className="flex items-center gap-3 mb-1">
                                <Shield className="w-4 h-4 text-slate-400" />
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tip Cont</span>
                            </div>
                            <div className="font-medium text-slate-900 ml-7 flex items-center gap-2">
                                {user.esteContGoogle ? (
                                    <>
                                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                                            <path
                                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                                fill="#4285F4"
                                            />
                                            <path
                                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                                fill="#34A853"
                                            />
                                            <path
                                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                                fill="#FBBC05"
                                            />
                                            <path
                                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                                fill="#EA4335"
                                            />
                                        </svg>
                                        Conectat cu Google
                                    </>
                                ) : (
                                    'Cont Standard (Email/Parolă)'
                                )}
                            </div>
                        </div>

                        <div className="p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-200 transition-colors">
                            <div className="flex items-center gap-3 mb-1">
                                <Calendar className="w-4 h-4 text-slate-400" />
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Data Înregistrării</span>
                            </div>
                            <div className="font-medium text-slate-900 ml-7">
                                {/* Assuming we might have this data later, for now prompt */}
                                -
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8 border-t border-slate-100 pt-6 flex justify-end">
                    <button
                        onClick={logout}
                        className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors font-medium text-sm flex items-center gap-2"
                    >
                        Deconectare
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProfileSettings;
