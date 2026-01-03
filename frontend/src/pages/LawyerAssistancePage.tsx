
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SEOHead from '../components/SEOHead';
import { CheckCircle2, AlertCircle, ArrowRight, Gavel, FileText, Send, User } from 'lucide-react';

interface LawyerAssistanceFormInputs {
    name: string;
    email: string;
    phone: string;
    is_company: boolean;
    is_represented: boolean;
    county: string;
    practice_area: string;
    description: string;
    terms_accepted: boolean;
}

const COUNTIES = [
    'Alba', 'Arad', 'Argeș', 'Bacău', 'Bihor', 'Bistrița-Năsăud', 'Botoșani', 'Brașov', 'Brăila', 'București',
    'Buzău', 'Caraș-Severin', 'Călărași', 'Cluj', 'Constanța', 'Covasna', 'Dâmbovița', 'Dolj', 'Galați', 'Giurgiu',
    'Gorj', 'Harghita', 'Hunedoara', 'Ialomița', 'Iași', 'Ilfov', 'Maramureș', 'Mehedinți', 'Mureș', 'Neamț',
    'Olt', 'Prahova', 'Satu Mare', 'Sălaj', 'Sibiu', 'Suceava', 'Teleorman', 'Timiș', 'Tulcea', 'Vaslui',
    'Vâlcea', 'Vrancea'
];

const PRACTICE_AREAS = [
    'Drept Civil', 'Drept Penal', 'Drept Comercial', 'Dreptul Familiei', 'Dreptul Muncii',
    'Drept Administrativ', 'Drept Fiscal', 'Dreptul Proprietatii Intelectuale', 'Insolventa',
    'Real Estate', 'Drept Bancar', 'Altul'
];

const LawyerAssistancePage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const [formData, setFormData] = useState<LawyerAssistanceFormInputs>({
        name: '',
        email: '',
        phone: '',
        is_company: false,
        is_represented: false,
        county: '',
        practice_area: '',
        description: '',
        terms_accepted: false
    });

    const [errors, setErrors] = useState<Partial<Record<keyof LawyerAssistanceFormInputs, string>>>({});

    useEffect(() => {
        if (user) {
            setFormData(prev => ({
                ...prev,
                name: user.numeComplet || '',
                email: user.email || ''
            }));
        }
    }, [user]);

    const validate = (): boolean => {
        const newErrors: Partial<Record<keyof LawyerAssistanceFormInputs, string>> = {};
        let isValid = true;

        if (!formData.name.trim()) {
            newErrors.name = 'Numele este obligatoriu';
            isValid = false;
        }

        if (!formData.email.trim()) {
            newErrors.email = 'Emailul este obligatoriu';
            isValid = false;
        } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(formData.email)) {
            newErrors.email = 'Adresă de email invalidă';
            isValid = false;
        }

        if (!formData.phone.trim()) {
            newErrors.phone = 'Telefonul este obligatoriu';
            isValid = false;
        } else if (formData.phone.length < 10) {
            newErrors.phone = 'Minim 10 cifre';
            isValid = false;
        }

        if (!formData.county) {
            newErrors.county = 'Selectați județul';
            isValid = false;
        }

        if (!formData.practice_area) {
            newErrors.practice_area = 'Selectați aria de practică';
            isValid = false;
        }

        if (!formData.description.trim()) {
            newErrors.description = 'Descrierea este obligatorie';
            isValid = false;
        } else if (formData.description.length < 20) {
            newErrors.description = 'Vă rugăm să oferiți mai multe detalii (minim 20 caractere)';
            isValid = false;
        }

        if (!formData.terms_accepted) {
            newErrors.terms_accepted = 'Trebuie să fiți de acord cu termenii.';
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;

        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));

        // Clear error when user starts typing
        if (errors[name as keyof LawyerAssistanceFormInputs]) {
            setErrors(prev => ({ ...prev, [name]: undefined }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validate()) {
            const firstErrorField = document.querySelector('.border-red-500');
            firstErrorField?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        setIsSubmitting(true);
        setSubmitError(null);

        try {
            const response = await fetch('/api/lawyer-assistance/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to submit request');
            }

            setSubmitSuccess(true);
            window.scrollTo(0, 0);
        } catch (error: any) {
            console.error('Submission error:', error);
            setSubmitError(error.message || 'A apărut o eroare la trimiterea cererii. Vă rugăm să încercați din nou.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (submitSuccess) {
        return (
            <div className="min-h-screen bg-brand-light flex flex-col">
                <SEOHead
                    title="Cerere Trimisă | LegeaAplicata"
                    description="Cererea dumneavoastră de asistență juridică a fost trimisă cu succes."
                />
                <Header onToggleMenu={() => { }} onContribuieClick={() => { }} />

                <main className="flex-grow flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full text-center border border-brand-primary/10 animate-in fade-in zoom-in-95 duration-300">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle2 className="w-10 h-10 text-green-600" />
                        </div>
                        <h2 className="text-3xl font-bold text-slate-900 mb-4">Cerere Trimisă!</h2>
                        <p className="text-slate-600 mb-8 text-lg">
                            Am primit detaliile dumneavoastră. Un specialist va analiza solicitarea și vă va contacta în cel mai scurt timp posibil.
                        </p>
                        <button
                            onClick={() => {
                                setSubmitSuccess(false);
                                setFormData({
                                    name: user?.numeComplet || '',
                                    email: user?.email || '',
                                    phone: '',
                                    is_company: false,
                                    is_represented: false,
                                    county: '',
                                    practice_area: '',
                                    description: '',
                                    terms_accepted: false
                                });
                                navigate('/');
                            }}
                            className="inline-flex items-center justify-center px-8 py-3 bg-brand-primary text-white font-semibold rounded-xl hover:bg-brand-primary/90 transition-colors shadow-lg shadow-brand-primary/25"
                        >
                            Înapoi la Pagina Principală
                        </button>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-brand-light flex flex-col font-sans">
            <SEOHead
                title="Solicită Asistență Juridică | LegeaAplicata"
                description="Conectați-vă cu un specialist juridic pentru situația dumneavoastră."
            />
            <Header onToggleMenu={() => { }} onContribuieClick={() => { }} />

            <main className="flex-grow container mx-auto px-4 py-8 sm:py-12">
                <div className="max-w-4xl mx-auto">

                    {/* Hero Section */}
                    <div className="text-center mb-12 animate-in fade-in slide-in-from-top-4 duration-500">
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-purple-600 mb-4 filter drop-shadow-sm">
                            Solicitați Asistență Juridică
                        </h1>
                        <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
                            Completați formularul de mai jos pentru a ne oferi detalii despre situația dvs.
                            Un specialist vă va contacta în cel mai scurt timp posibil.
                        </p>
                    </div>

                    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden relative animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
                        {/* Decorative background elements */}
                        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-brand-primary/5 rounded-full blur-3xl pointer-events-none"></div>
                        <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl pointer-events-none"></div>

                        <div className="p-6 sm:p-10 relative z-10">
                            {submitError && (
                                <div className="mb-8 bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl flex items-start gap-3">
                                    <AlertCircle className="w-6 h-6 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-semibold">Eroare</h4>
                                        <p>{submitError}</p>
                                    </div>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-8">
                                {/* Contact Info Section */}
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3 text-slate-800 border-b border-slate-100 pb-2">
                                        <User className="w-5 h-5 text-brand-primary" />
                                        <h3 className="text-xl font-bold">Informații de Contact</h3>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        {/* Name */}
                                        <div className="space-y-2">
                                            <label htmlFor="name" className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                                                Nume și Prenume <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                id="name"
                                                name="name"
                                                type="text"
                                                placeholder="Ex: Popescu Ion"
                                                value={formData.name}
                                                onChange={handleChange}
                                                className={`w-full px-4 py-3 rounded-xl border ${errors.name ? 'border-red-500 focus:ring-red-200' : 'border-slate-300 focus:border-brand-primary focus:ring-brand-primary/20'} focus:outline-none focus:ring-4 transition-all duration-200 bg-slate-50 focus:bg-white`}
                                            />
                                            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                                        </div>

                                        {/* Email */}
                                        <div className="space-y-2">
                                            <label htmlFor="email" className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                                                Adresă de Email <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                id="email"
                                                name="email"
                                                type="email"
                                                placeholder="Ex: email@domeniu.ro"
                                                value={formData.email}
                                                onChange={handleChange}
                                                className={`w-full px-4 py-3 rounded-xl border ${errors.email ? 'border-red-500 focus:ring-red-200' : 'border-slate-300 focus:border-brand-primary focus:ring-brand-primary/20'} focus:outline-none focus:ring-4 transition-all duration-200 bg-slate-50 focus:bg-white`}
                                            />
                                            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                                        </div>

                                        {/* Phone */}
                                        <div className="space-y-2">
                                            <label htmlFor="phone" className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                                                Număr de Telefon <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                id="phone"
                                                name="phone"
                                                type="tel"
                                                placeholder="Ex: 07xxxxxxx"
                                                value={formData.phone}
                                                onChange={handleChange}
                                                className={`w-full px-4 py-3 rounded-xl border ${errors.phone ? 'border-red-500 focus:ring-red-200' : 'border-slate-300 focus:border-brand-primary focus:ring-brand-primary/20'} focus:outline-none focus:ring-4 transition-all duration-200 bg-slate-50 focus:bg-white`}
                                            />
                                            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                                        </div>
                                    </div>

                                    {/* Checkboxes */}
                                    <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 pt-2">
                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <div className="relative flex items-center">
                                                <input
                                                    type="checkbox"
                                                    name="is_company"
                                                    checked={formData.is_company}
                                                    onChange={handleChange}
                                                    className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border-2 border-slate-300 transition-all checked:border-brand-primary checked:bg-brand-primary group-hover:border-brand-primary"
                                                />
                                                <CheckCircle2 className="pointer-events-none absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 transition-opacity peer-checked:opacity-100" />
                                            </div>
                                            <span className="text-slate-700 group-hover:text-brand-primary transition-colors font-medium">Sunt persoană juridică</span>
                                        </label>

                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <div className="relative flex items-center">
                                                <input
                                                    type="checkbox"
                                                    name="is_represented"
                                                    checked={formData.is_represented}
                                                    onChange={handleChange}
                                                    className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border-2 border-slate-300 transition-all checked:border-brand-primary checked:bg-brand-primary group-hover:border-brand-primary"
                                                />
                                                <CheckCircle2 className="pointer-events-none absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 transition-opacity peer-checked:opacity-100" />
                                            </div>
                                            <span className="text-slate-700 group-hover:text-brand-primary transition-colors font-medium">Sunt deja reprezentat(ă) de un avocat</span>
                                        </label>
                                    </div>
                                </div>

                                {/* Case Details Section */}
                                <div className="space-y-6 pt-4">
                                    <div className="flex items-center gap-3 text-slate-800 border-b border-slate-100 pb-2">
                                        <Gavel className="w-5 h-5 text-brand-primary" />
                                        <h3 className="text-xl font-bold">Detalii Speță</h3>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* County */}
                                        <div className="space-y-2">
                                            <label htmlFor="county" className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                                                Județ <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <select
                                                    id="county"
                                                    name="county"
                                                    value={formData.county}
                                                    onChange={handleChange}
                                                    className={`w-full px-4 py-3 appearance-none rounded-xl border ${errors.county ? 'border-red-500 focus:ring-red-200' : 'border-slate-300 focus:border-brand-primary focus:ring-brand-primary/20'} focus:outline-none focus:ring-4 transition-all duration-200 bg-slate-50 focus:bg-white cursor-pointer`}
                                                >
                                                    <option value="">-- Selectați Județul --</option>
                                                    {COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                                    <ArrowRight className="w-4 h-4 rotate-90" />
                                                </div>
                                            </div>
                                            {errors.county && <p className="text-red-500 text-xs mt-1">{errors.county}</p>}
                                            <p className="text-xs text-slate-400 flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3" />
                                                Selectați județul relevant pentru cazul dvs.
                                            </p>
                                        </div>

                                        {/* Practice Area */}
                                        <div className="space-y-2">
                                            <label htmlFor="practice_area" className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                                                Aria de practică <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <select
                                                    id="practice_area"
                                                    name="practice_area"
                                                    value={formData.practice_area}
                                                    onChange={handleChange}
                                                    className={`w-full px-4 py-3 appearance-none rounded-xl border ${errors.practice_area ? 'border-red-500 focus:ring-red-200' : 'border-slate-300 focus:border-brand-primary focus:ring-brand-primary/20'} focus:outline-none focus:ring-4 transition-all duration-200 bg-slate-50 focus:bg-white cursor-pointer`}
                                                >
                                                    <option value="">-- Selectați aria de practică --</option>
                                                    {PRACTICE_AREAS.map(area => <option key={area} value={area}>{area}</option>)}
                                                </select>
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                                    <ArrowRight className="w-4 h-4 rotate-90" />
                                                </div>
                                            </div>
                                            {errors.practice_area && <p className="text-red-500 text-xs mt-1">{errors.practice_area}</p>}
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <div className="space-y-2">
                                        <label htmlFor="description" className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                                            Descrieți situația dvs. cât mai în detaliu <span className="text-red-500">*</span>
                                        </label>
                                        <textarea
                                            id="description"
                                            name="description"
                                            rows={6}
                                            placeholder="Scrieți aici detaliile cazului dvs..."
                                            value={formData.description}
                                            onChange={handleChange}
                                            className={`w-full px-4 py-3 rounded-xl border ${errors.description ? 'border-red-500 focus:ring-red-200' : 'border-slate-300 focus:border-brand-primary focus:ring-brand-primary/20'} focus:outline-none focus:ring-4 transition-all duration-200 bg-slate-50 focus:bg-white resize-y`}
                                        />
                                        {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
                                        <p className="text-xs text-slate-400 flex items-start gap-1">
                                            <FileText className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                            <span>Oferiți cât mai multe detalii pentru a permite specialiștilor să înțeleagă contextul și să vă ofere o primă evaluare corectă.</span>
                                        </p>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <label className="flex items-start gap-3 cursor-pointer group">
                                        <div className="relative flex items-center mt-1">
                                            <input
                                                type="checkbox"
                                                name="terms_accepted"
                                                checked={formData.terms_accepted}
                                                onChange={handleChange}
                                                className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border-2 border-slate-300 transition-all checked:border-brand-primary checked:bg-brand-primary group-hover:border-brand-primary"
                                            />
                                            <CheckCircle2 className="pointer-events-none absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 transition-opacity peer-checked:opacity-100" />
                                        </div>
                                        <span className={`text-sm ${errors.terms_accepted ? 'text-red-500' : 'text-slate-600'} group-hover:text-slate-900 transition-colors`}>
                                            Sunt de acord cu <a href="/terms" className="text-brand-primary underline hover:text-brand-primary/80" target="_blank">Termeni și condiții</a> / <a href="/privacy-policy" className="text-brand-primary underline hover:text-brand-primary/80" target="_blank">Politica cookie / Protecția datelor</a>.
                                        </span>
                                    </label>
                                    {errors.terms_accepted && <p className="text-red-500 text-xs mt-1 ml-8">{errors.terms_accepted}</p>}
                                </div>

                                <div className="pt-4">
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className={`w-full flex items-center justify-center gap-2 py-4 px-6 rounded-xl font-bold text-lg text-white shadow-xl transition-all transform hover:-translate-y-1 hover:shadow-2xl focus:ring-4 focus:ring-purple-300 ${isSubmitting ? 'bg-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-brand-primary to-purple-600 hover:to-purple-700'}`}
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                Se trimite...
                                            </>
                                        ) : (
                                            <>
                                                <Send className="w-5 h-5" />
                                                Trimite Cererea
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default LawyerAssistancePage;
