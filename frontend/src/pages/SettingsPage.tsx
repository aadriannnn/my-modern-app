import React, { useState, useEffect } from 'react';
import { getSettings, updateSettings, resetSettings, refreshFilters, precalculateModelsCodes, getPrecalculateStatus, stopPrecalculate, getFeedbackStats, type FeedbackStats } from '../lib/api';
import { Save, RotateCcw, RefreshCw, Info, AlertCircle, CheckCircle2, Play, Square, ThumbsUp, ThumbsDown, BarChart3 } from 'lucide-react';
import { Switch } from '@headlessui/react';
import Footer from '../components/Footer';
import SEOHead from '../components/SEOHead';

interface SettingItem {
    value: any;
    label: string;
    tooltip: string;
    min?: number;
    max?: number;
    step?: number;
    type?: string; // 'number', 'boolean', 'string'
}

interface SettingsSection {
    [key: string]: SettingItem | SettingsSection;
}

const SettingsPage: React.FC = () => {
    const [settings, setSettings] = useState<SettingsSection | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<string>('');
    const [feedbackStats, setFeedbackStats] = useState<FeedbackStats | null>(null);

    useEffect(() => {
        loadSettings();
        loadFeedbackStats();
    }, []);

    const loadFeedbackStats = async () => {
        try {
            const stats = await getFeedbackStats();
            setFeedbackStats(stats);
        } catch (err) {
            console.error('Error loading feedback stats:', err);
            // Set default empty stats to show the UI even if fetch fails (e.g. table empty)
            setFeedbackStats({
                total_feedback: 0,
                good_count: 0,
                bad_count: 0,
                good_percentage: 0,
                bad_percentage: 0
            });
        }
    };

    const loadSettings = async () => {
        try {
            setLoading(true);
            const data = await getSettings();
            setSettings(data);
            // Set first key as active tab if not set
            if (!activeTab && data && Object.keys(data).length > 0) {
                setActiveTab(Object.keys(data)[0]);
            }
            setError(null);
        } catch (err) {
            setError('Nu s-au putut încărca setările. Verifică conexiunea la server.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!settings) return;
        try {
            setSaving(true);
            await updateSettings(settings);
            setSuccess('Setările au fost salvate cu succes!');
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError('Eroare la salvarea setărilor.');
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const handleReset = async () => {
        if (!window.confirm('Sigur dorești să resetezi toate setările la valorile implicite?')) return;
        try {
            setLoading(true);
            const data = await resetSettings();
            setSettings(data);
            setSuccess('Setările au fost resetate la valorile implicite.');
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError('Eroare la resetarea setărilor.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleRefreshFilters = async () => {
        if (!window.confirm('Sigur dorești să reîncarci toate filtrele? Acest proces poate dura câteva secunde.')) return;
        try {
            setRefreshing(true);
            await refreshFilters();
            setSuccess('Filtrele au fost reîncărcate cu succes! Gruparea obiectelor juridice a fost actualizată.');
            setTimeout(() => setSuccess(null), 5000);
        } catch (err) {
            setError('Eroare la reîncărcarea filtrelor. Verifică conexiunea la server.');
            console.error(err);
            setTimeout(() => setError(null), 5000);
        } finally {
            setRefreshing(false);
        }
    };

    const [precalculating, setPrecalculating] = useState(false);
    const [precalcStatus, setPrecalcStatus] = useState<any>(null);
    const [showRestartDialog, setShowRestartDialog] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<string | null>(null);

    // Poll for status when precalculating
    useEffect(() => {
        if (!precalculating) return;

        const pollStatus = async () => {
            try {
                const status = await getPrecalculateStatus();
                setPrecalcStatus(status);

                // If no longer running, stop polling
                if (!status.is_running) {
                    setPrecalculating(false);

                    if (status.last_run_stats) {
                        const stats = status.last_run_stats;
                        if (stats.stopped) {
                            setSuccess(`Pre-calculare oprită! ${stats.processed} spete procesate.`);
                        } else if (stats.success) {
                            setSuccess(`Pre-calculare finalizată! ${stats.processed} spete procesate în ${stats.duration_seconds?.toFixed(1)}s.`);
                        } else {
                            setError(stats.error || 'Eroare la pre-calculare.');
                        }
                        setTimeout(() => {
                            setSuccess(null);
                            setError(null);
                        }, 10000);
                    }
                }
            } catch (err: any) {
                console.error('Error polling status:', err);
            }
        };

        // Poll immediately
        pollStatus();

        // Then poll every 2 seconds
        const interval = setInterval(pollStatus, 2000);

        return () => clearInterval(interval);
    }, [precalculating]);

    const handlePrecalculate = async () => {
        try {
            // First check status to see if we can resume
            const status = await getPrecalculateStatus();

            if (status.can_resume) {
                // Show dialog with options
                setShowRestartDialog(true);
            } else {
                // No incomplete cases, just start fresh
                await startPrecalculation(true);
            }
        } catch (err: any) {
            setError(err.message || 'Eroare la verificarea statusului.');
            console.error(err);
            setTimeout(() => setError(null), 5000);
        }
    };

    const startPrecalculation = async (restart: boolean) => {
        setShowRestartDialog(false);
        try {
            setPrecalculating(true);
            setPrecalcStatus(null);
            await precalculateModelsCodes(restart);
            // Status polling will handle the rest
        } catch (err: any) {
            setError(err.message || 'Eroare la pornirea pre-calculării.');
            console.error(err);
            setPrecalculating(false);
            setTimeout(() => setError(null), 5000);
        }
    };

    const handleStopPrecalculate = async () => {
        if (!window.confirm('Sigur dorești să oprești procesul de pre-calculare? Progresul până acum va fi salvat.')) return;
        try {
            await stopPrecalculate();
            setSuccess('Proces oprit. Se finalizează batch-ul curent...');
            setTimeout(() => setSuccess(null), 5000);
        } catch (err: any) {
            setError(err.message || 'Eroare la oprirea procesului.');
            console.error(err);
            setTimeout(() => setError(null), 5000);
        }
    };

    const handleAnalyzeLLM = async () => {
        try {
            setAnalyzing(true);
            setAnalysisResult(null);
            setError(null);

            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/settings/analyze-llm-data`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || 'Eroare la analiza LLM');
            }

            const data = await response.json();

            if (!data.success) {
                setError(data.message || 'Nu există date de analizat.');
                return;
            }

            if (data.response) {
                setAnalysisResult(data.response);
                setSuccess('Analiză finalizată cu succes!');
            } else {
                setError('Serverul nu a returnat un răspuns valid.');
            }

        } catch (err: any) {
            setError(err.message || 'Eroare la analiza datelor.');
            console.error(err);
        } finally {
            setAnalyzing(false);
        }
    };

    const updateSettingValue = (path: string[], newValue: any) => {
        setSettings((prev) => {
            if (!prev) return null;
            const newSettings = JSON.parse(JSON.stringify(prev));
            let current = newSettings;
            for (let i = 0; i < path.length - 1; i++) {
                current = current[path[i]];
            }
            current[path[path.length - 1]].value = newValue;
            return newSettings;
        });
    };

    // Helper to determine if an object is a SettingItem (leaf) or a Section (branch)
    const isSettingItem = (obj: any): obj is SettingItem => {
        return obj && typeof obj === 'object' && 'value' in obj && 'label' in obj;
    };

    const renderSettingControl = (key: string, item: SettingItem, path: string[]) => {
        const isNumber = typeof item.value === 'number';
        const isBoolean = typeof item.value === 'boolean';
        const isText = item.type === 'text';
        const isString = item.type === 'string';

        return (
            <div key={key} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:border-blue-100 transition-colors">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h4 className="font-medium text-slate-900 text-lg flex items-center gap-2">
                            {item.label}
                            <div className="group relative flex items-center">
                                <Info className="w-4 h-4 text-slate-400 hover:text-blue-500 cursor-help transition-colors" />
                                <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 w-64 bg-slate-800 text-white text-xs rounded-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 shadow-xl pointer-events-none">
                                    {item.tooltip}
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 -ml-1 border-4 border-transparent border-r-slate-800"></div>
                                </div>
                            </div>
                        </h4>
                        <p className="text-sm text-slate-500 mt-1">{item.tooltip}</p>
                    </div>
                    {!isText && !isString && (
                        <div className="text-right">
                            <span className="inline-block px-3 py-1 bg-slate-100 text-slate-700 rounded-md font-mono text-sm font-semibold">
                                {isBoolean ? (item.value ? 'ON' : 'OFF') : item.value}
                            </span>
                        </div>
                    )}
                </div>

                {isNumber && (
                    <div className="space-y-2">
                        <input
                            type="range"
                            min={item.min ?? 0}
                            max={item.max ?? 100}
                            step={item.step ?? 1}
                            value={item.value}
                            onChange={(e) => updateSettingValue([...path, 'value'], parseFloat(e.target.value))}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:accent-blue-700"
                        />
                        <div className="flex justify-between text-xs text-slate-400 font-mono">
                            <span>{item.min ?? 0}</span>
                            <span>{item.max ?? 100}</span>
                        </div>
                    </div>
                )}

                {isBoolean && (
                    <Switch
                        checked={item.value}
                        onChange={(checked: boolean) => updateSettingValue([...path, 'value'], checked)}
                        className={`${item.value ? 'bg-blue-600' : 'bg-slate-200'
                            } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
                    >
                        <span
                            className={`${item.value ? 'translate-x-6' : 'translate-x-1'
                                } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                        />
                    </Switch>
                )}

                {isText && (
                    <textarea
                        value={item.value}
                        onChange={(e) => updateSettingValue([...path, 'value'], e.target.value)}
                        className="w-full min-h-[200px] px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm resize-y"
                        placeholder={item.tooltip}
                    />
                )}

                {isString && (
                    <input
                        type="text"
                        value={item.value}
                        onChange={(e) => updateSettingValue([...path, 'value'], e.target.value)}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder={item.tooltip}
                    />
                )}
            </div>
        );
    };

    const renderSection = (data: SettingsSection, path: string[] = []) => {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {Object.entries(data).map(([key, value]) => {
                    if (isSettingItem(value)) {
                        return renderSettingControl(key, value, [...path, key]);
                    }
                    return null; // Nested sections handled by tabs for top level
                })}
            </div>
        );
    };

    // Format section name (e.g., "ponderi_cautare_spete" -> "Ponderi Cautare Spete")
    const formatSectionName = (name: string) => {
        return name
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    if (loading && !settings) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-red-100">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-8 h-8 text-red-600" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Eroare</h3>
                    <p className="text-slate-600 mb-6">{error}</p>
                    <button
                        onClick={loadSettings}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                        Încearcă din nou
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <SEOHead
                title="Configurare Sistem | LegeaAplicata"
                description="Pagină de configurare și setări sistem pentru administratori LegeaAplicata."
                noIndex={true}
                canonicalUrl="https://chat.legeaaplicata.ro/setari"
            />
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Configurare Sistem</h1>
                        <p className="text-sm text-slate-500 mt-1">Ajustează parametrii algoritmilor de căutare și matching</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleReset}
                            disabled={saving || refreshing}
                            className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium text-sm"
                        >
                            <RotateCcw className="w-4 h-4" />
                            Resetează
                        </button>
                        <button
                            onClick={handleRefreshFilters}
                            disabled={saving || refreshing}
                            className={`flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium text-sm border border-blue-200 ${refreshing ? 'opacity-75 cursor-wait' : ''}`}
                            title="Reîncarcă și regrupează inteligent toate filtrele din baza de date"
                        >
                            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                            {refreshing ? 'Se reîncarcă...' : 'Reîncarcă Filtre'}
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className={`flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm shadow-blue-200 ${saving ? 'opacity-75 cursor-wait' : ''}`}
                        >
                            {saving ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            {saving ? 'Se salvează...' : 'Salvează Modificările'}
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Success Message */}
                {success && (
                    <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
                        <CheckCircle2 className="w-5 h-5" />
                        {success}
                    </div>
                )}

                {/* Restart Dialog Modal */}
                {showRestartDialog && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
                            <h3 className="text-xl font-bold text-slate-900 mb-4">Optiuni Pre-calculare</h3>
                            <p className="text-slate-600 mb-6">
                                Sistemul a găsit spete care nu au modele sau coduri pre-calculate.
                                Cum dorești să continui?
                            </p>
                            <div className="space-y-3">
                                <button
                                    onClick={() => startPrecalculation(false)}
                                    className="w-full flex items-center gap-3 px-5 py-4 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl transition-colors font-medium border-2 border-blue-200"
                                >
                                    <Play className="w-5 h-5" />
                                    <div className="text-left flex-1">
                                        <div className="font-semibold">Completează spetele incomplete</div>
                                        <div className="text-sm text-blue-600">Procesează doar cazurile fără modele/coduri</div>
                                    </div>
                                </button>
                                <button
                                    onClick={() => startPrecalculation(true)}
                                    className="w-full flex items-center gap-3 px-5 py-4 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl transition-colors font-medium border-2 border-purple-200"
                                >
                                    <RefreshCw className="w-5 h-5" />
                                    <div className="text-left flex-1">
                                        <div className="font-semibold">Restart complet</div>
                                        <div className="text-sm text-purple-600">Șterge tot și recalculează toate spetele</div>
                                    </div>
                                </button>
                                <button
                                    onClick={() => setShowRestartDialog(false)}
                                    className="w-full px-5 py-3 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors font-medium"
                                >
                                    Anulează
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Feedback Stats Section */}
                {feedbackStats && (
                    <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-4 duration-500 delay-100">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                                <BarChart3 className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 font-medium">Total Feedback</p>
                                <p className="text-2xl font-bold text-slate-900">{feedbackStats.total_feedback}</p>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
                            <div className="p-3 bg-green-50 text-green-600 rounded-xl">
                                <ThumbsUp className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 font-medium">Răspunsuri Bune</p>
                                <div className="flex items-baseline gap-2">
                                    <p className="text-2xl font-bold text-slate-900">{feedbackStats.good_count}</p>
                                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                        {feedbackStats.good_percentage}%
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
                            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                                <ThumbsDown className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 font-medium">Răspunsuri Rele</p>
                                <div className="flex items-baseline gap-2">
                                    <p className="text-2xl font-bold text-slate-900">{feedbackStats.bad_count}</p>
                                    <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                                        {feedbackStats.bad_percentage}%
                                Pre-calculează și stochează modelele de acte și codurile relevante pentru fiecare spetă din baza de date.
                                Această operațiune îmbunătățește semnificativ timpul de răspuns pentru interogările utilizatorilor,
                                eliminând necesitatea căutării în timp real folosind embeddings și algoritmi complecși.
                            </p>
                            <p className="text-xs text-purple-600 mt-2 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                Proces intensiv - se recomandă rularea în afara orelor de vârf
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            {precalculating ? (
                                <button
                                    onClick={handleStopPrecalculate}
                                    className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl hover:from-red-700 hover:to-orange-700 transition-all font-medium shadow-lg shadow-red-200"
                                >
                                    <Square className="w-5 h-5" />
                                    Oprește Procesul
                                </button>
                            ) : (
                                <button
                                    onClick={handlePrecalculate}
                                    disabled={saving || refreshing}
                                    className={`flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all font-medium shadow-lg shadow-purple-200 ${(saving || refreshing) ? 'opacity-75 cursor-not-allowed' : ''}`}
                                >
                                    <Play className="w-5 h-5" />
                                    Pre-calculează Modele și Coduri
                                </button>
                            )}

                            {precalcStatus?.can_resume && !precalculating && (
                                <div className="px-4 py-2 bg-yellow-50 text-yellow-700 rounded-lg text-sm font-medium border border-yellow-200">
                                    📊 {precalcStatus.incomplete_count?.toLocaleString()} spete incomplete
                                </div>
                            )}
                        </div>

                        {/* Progress Bar and Stats */}
                        {precalculating && precalcStatus?.current_progress && (
                            <div className="bg-white/60 rounded-xl px-5 py-4 border border-purple-100">
                                <div className="mb-3">
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-slate-600 font-medium">Progres</span>
                                        <span className="text-slate-900 font-bold">
                                            {precalcStatus.current_progress.processed?.toLocaleString()} / {precalcStatus.current_progress.total?.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-purple-600 to-blue-600 transition-all duration-500 ease-out rounded-full"
                                            style={{
                                                width: `${precalcStatus.current_progress.total > 0 ? (precalcStatus.current_progress.processed / precalcStatus.current_progress.total * 100) : 0}%`
                                            }}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                                    <div>
                                        <div className="text-xs text-slate-500">Procesate</div>
                                        <div className="font-bold text-slate-900">{precalcStatus.current_progress.processed?.toLocaleString()}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-slate-500">Cu modele</div>
                                        <div className="font-bold text-blue-600">{precalcStatus.current_progress.with_modele?.toLocaleString()}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-slate-500">Cu coduri</div>
                                        <div className="font-bold text-purple-600">{precalcStatus.current_progress.with_coduri?.toLocaleString()}</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* LLM Analysis Section - Hidden but backend remains functional */}
                <div style={{ display: 'none' }} className="mb-8 bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-200 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2">🤖 Analiză LLM Locală</h3>
                            <p className="text-sm text-slate-600 leading-relaxed max-w-3xl">
                                Trimite situația de fapt din ultima căutare către serverul LLM local pentru a identifica cele mai relevante spețe.
                            </p>
                            <p className="text-xs text-indigo-600 mt-2 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                Procesul poate dura 10-15 minute. Te rugăm să aștepți.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <button
                            onClick={handleAnalyzeLLM}
                            disabled={analyzing || saving || refreshing}
                            className={`flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl hover:from-indigo-700 hover:to-violet-700 transition-all font-medium shadow-lg shadow-indigo-200 ${(analyzing || saving || refreshing) ? 'opacity-75 cursor-not-allowed' : ''}`}
                        >
                            {analyzing ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Play className="w-5 h-5" />
                            )}
                            {analyzing ? 'Analizez speța... te rog așteaptă 10-15 minute' : 'Analizează cu LLM Local'}
                        </button>

                        {analysisResult && (
                            <div className="mt-4 bg-white rounded-xl p-4 border border-indigo-100 shadow-sm animate-in fade-in slide-in-from-top-2">
                                <h4 className="text-sm font-bold text-slate-700 mb-2">Rezultat Analiză (ID-uri Spețe Relevante):</h4>
                                <div className="p-3 bg-slate-50 rounded-lg font-mono text-slate-800 text-sm border border-slate-200 break-all">
                                    {analysisResult}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Sidebar Navigation */}
                    <nav className="w-full lg:w-64 flex-shrink-0 space-y-1">
                        {settings && Object.keys(settings).map((sectionKey) => (
                            <button
                                key={sectionKey}
                                onClick={() => setActiveTab(sectionKey)}
                                className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-between ${activeTab === sectionKey
                                    ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-200'
                                    : 'text-slate-600 hover:bg-white/50 hover:text-slate-900'
                                    }`}
                            >
                                {formatSectionName(sectionKey)}
                                {activeTab === sectionKey && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                                )}
                            </button>
                        ))}
                    </nav>

                    {/* Main Content Area */}
                    <div className="flex-1">
                        {settings && activeTab && settings[activeTab] && (
                            <div className="animate-in fade-in duration-300">
                                <div className="mb-6">
                                    <h2 className="text-xl font-bold text-slate-900">{formatSectionName(activeTab)}</h2>
                                    <p className="text-slate-500 text-sm mt-1">
                                        Configurează parametrii pentru această secțiune. Modificările au efect imediat după salvare.
                                    </p>
                                </div>

                                {/* Render the section content */}
                                {renderSection(settings[activeTab] as SettingsSection, [activeTab])}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default SettingsPage;
