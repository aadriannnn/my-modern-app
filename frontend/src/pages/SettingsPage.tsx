import React, { useEffect, useState } from 'react';
import { getSettings, updateSettings, resetSettings } from '../lib/api';
import { Save, RotateCcw, Info, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Switch } from '@headlessui/react';

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
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<string>('');

    useEffect(() => {
        loadSettings();
    }, []);

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
                    <div className="text-right">
                        <span className="inline-block px-3 py-1 bg-slate-100 text-slate-700 rounded-md font-mono text-sm font-semibold">
                            {isBoolean ? (item.value ? 'ON' : 'OFF') : item.value}
                        </span>
                    </div>
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
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium text-sm"
                        >
                            <RotateCcw className="w-4 h-4" />
                            Resetează
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
        </div>
    );
};

export default SettingsPage;
