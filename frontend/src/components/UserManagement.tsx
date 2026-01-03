
import React, { useState, useEffect, useCallback } from 'react';
import { getUsers, updateUserRole } from '../lib/api';
import { Search, Loader2, AlertCircle, CheckCircle2, User, ChevronLeft, ChevronRight, Shield, ShieldAlert, ShieldCheck } from 'lucide-react';

interface UserData {
    id: string;
    email: string;
    numeComplet: string;
    rol: 'basic' | 'pro' | 'admin';
    cuiFacturare?: string;
    telefon?: string;
    dataCreare: string;
}

const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalUsers, setTotalUsers] = useState(0);
    const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const fetchUsers = useCallback(async (pageNum: number, search: string) => {
        setLoading(true);
        setError(null);
        try {
            const data = await getUsers(pageNum, 10, search);
            setUsers(data.items);
            setTotalPages(data.pages);
            setTotalUsers(data.total);
            setPage(data.page);
        } catch (err: any) {
            console.error(err);
            if (err.message && err.message.includes("401")) {
                setError("Nu ești autentificat. Te rog să te loghezi în aplicație.");
            } else if (err.message && err.message.includes("403")) {
                setError("Acces interzis. Această secțiune este vizibilă doar Administratorilor.");
            } else {
                setError("Eroare la încărcarea utilizatorilor.");
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // Debounce search
        const handler = setTimeout(() => {
            fetchUsers(page, searchTerm);
        }, 500);

        return () => clearTimeout(handler);
    }, [searchTerm, page, fetchUsers]);

    const handleRoleChange = async (userId: string, newRole: string) => {
        if (!window.confirm(`Sigur dorești să schimbi rolul utilizatorului în ${newRole.toUpperCase()}?`)) return;

        setUpdatingUserId(userId);
        try {
            await updateUserRole(userId, newRole);
            setSuccessMessage("Rolul utilizatorului a fost actualizat cu succes.");
            setTimeout(() => setSuccessMessage(null), 3000);

            // Optimistic update
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, rol: newRole as any } : u));
        } catch (err: any) {
            alert(err.message || "Eroare la actualizarea rolului.");
        } finally {
            setUpdatingUserId(null);
        }
    };

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'admin': return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'pro': return 'bg-blue-100 text-blue-800 border-blue-200';
            default: return 'bg-slate-100 text-slate-800 border-slate-200';
        }
    };

    const getRoleIcon = (role: string) => {
        switch (role) {
            case 'admin': return <ShieldAlert className="w-3 h-3 mr-1" />;
            case 'pro': return <ShieldCheck className="w-3 h-3 mr-1" />;
            default: return <User className="w-3 h-3 mr-1" />;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Shield className="w-5 h-5 text-blue-600" />
                        Gestionare Utilizatori
                    </h3>
                    <p className="text-sm text-slate-500">
                        Total utilizatori: {totalUsers}
                    </p>
                </div>

                <div className="relative w-full md:w-64">
                    <input
                        type="text"
                        placeholder="Caută utilizator..."
                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setPage(1); // Reset to first page
                        }}
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                </div>
            </div>

            {successMessage && (
                <div className="bg-green-50 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2 text-sm border border-green-200 animate-in fade-in slide-in-from-top-2">
                    <CheckCircle2 className="w-4 h-4" />
                    {successMessage}
                </div>
            )}

            {error ? (
                <div className="bg-red-50 text-red-700 px-4 py-8 rounded-lg flex flex-col items-center justify-center text-center gap-2 border border-red-200">
                    <AlertCircle className="w-8 h-8 opacity-50" />
                    <p className="font-medium">{error}</p>
                    {(error.includes("autentificat") || error.includes("Acces interzis")) && (
                        <a href="/login" className="mt-2 text-sm text-blue-600 hover:underline">Autentificare în Aplicație</a>
                    )}
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 font-semibold text-slate-700">Utilizator</th>
                                    <th className="px-6 py-4 font-semibold text-slate-700">Contact</th>
                                    <th className="px-6 py-4 font-semibold text-slate-700">Rol</th>
                                    <th className="px-6 py-4 font-semibold text-slate-700">Data Înregistrării</th>
                                    <th className="px-6 py-4 font-semibold text-slate-700">Facturare</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading && users.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                            <div className="flex justify-center items-center gap-2">
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                Se încarcă...
                                            </div>
                                        </td>
                                    </tr>
                                ) : users.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                            Nu s-au găsit utilizatori.
                                        </td>
                                    </tr>
                                ) : (
                                    users.map((user) => (
                                        <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-slate-900">{user.numeComplet || 'Fără nume'}</div>
                                                <div className="text-slate-500 text-xs">{user.email}</div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600">
                                                {user.telefon || '-'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="relative inline-block">
                                                    <select
                                                        value={user.rol}
                                                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                                        disabled={updatingUserId === user.id}
                                                        className={`appearance-none pl-8 pr-8 py-1.5 rounded-full text-xs font-semibold border focus:outline-none focus:ring-2 focus:ring-offset-1 transition-all cursor-pointer ${getRoleBadgeColor(user.rol)} ${updatingUserId === user.id ? 'opacity-50 cursor-wait' : ''}`}
                                                    >
                                                        <option value="basic">BASIC</option>
                                                        <option value="pro">PRO</option>
                                                        <option value="admin">ADMIN</option>
                                                    </select>
                                                    <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-current opacity-70">
                                                        {updatingUserId === user.id ? (
                                                            <Loader2 className="w-3 h-3 animate-spin" />
                                                        ) : (
                                                            getRoleIcon(user.rol)
                                                        )}
                                                    </div>
                                                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600">
                                                {new Date(user.dataCreare).toLocaleDateString('ro-RO')}
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 text-xs">
                                                {user.cuiFacturare ? (
                                                    <span className="font-mono bg-slate-100 px-2 py-1 rounded text-slate-700">
                                                        {user.cuiFacturare}
                                                    </span>
                                                ) : '-'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1 || loading}
                                className="p-2 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <span className="text-sm font-medium text-slate-600">
                                Pagina {page} din {totalPages}
                            </span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages || loading}
                                className="p-2 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default UserManagement;
