import React, { useState } from 'react';
import { Mail, Phone, MapPin, Facebook, Linkedin, Twitter, Loader2 } from 'lucide-react';
import { useDosar } from '../context/DosarContext';

const ContactPage: React.FC = () => {
    const { showToast } = useDosar();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        message: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name || !formData.email || !formData.message) {
            showToast('Vă rugăm să completați toate câmpurile obligatorii.', 'error');
            return;
        }

        if (formData.message.length < 10) {
            showToast('Mesajul trebuie să conțină cel puțin 10 caractere.', 'error');
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/contact/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (response.ok) {
                showToast('Mesajul a fost trimis cu succes!', 'success');
                setFormData({ name: '', email: '', message: '' });
            } else {
                showToast(data.detail || 'A apărut o eroare la trimiterea mesajului.', 'error');
            }
        } catch (error) {
            console.error('Error sending contact message:', error);
            showToast('A apărut o eroare de conexiune. Vă rugăm să încercați din nou.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-12">
                    <p className="mt-2 text-lg text-gray-600">
                        Aveți întrebări sau aveți nevoie de asistență? Contactați echipa Legea Aplicata.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Contact Information Column */}
                    <div className="bg-white rounded-2xl shadow-xl overflow-hidden p-8 flex flex-col justify-between">
                        <div>
                            <h2 className="text-3xl font-bold text-gray-900 mb-8">Informații Contact</h2>

                            <div className="space-y-6">
                                <div className="flex items-start space-x-4">
                                    <div className="bg-blue-50 p-3 rounded-lg text-brand-blue">
                                        <MapPin className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">Adresă</p>
                                        <p className="text-gray-600">Strada Exemplu Nr. 10, Bucuresti, 010101, Romania</p>
                                    </div>
                                </div>

                                <div className="flex items-start space-x-4">
                                    <div className="bg-blue-50 p-3 rounded-lg text-brand-blue">
                                        <Phone className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">Telefon</p>
                                        <p className="text-gray-600">+40 751 661 066</p>
                                    </div>
                                </div>

                                <div className="flex items-start space-x-4">
                                    <div className="bg-blue-50 p-3 rounded-lg text-brand-blue">
                                        <Mail className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">Email</p>
                                        <p className="text-gray-600">adrian@legeaaplicata.ro</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-12">
                                <h3 className="text-xl font-bold text-gray-900 mb-6">Urmăriți-ne</h3>
                                <div className="flex space-x-6">
                                    <a href="#" className="text-gray-400 hover:text-brand-blue transition-colors">
                                        <Facebook className="w-8 h-8" />
                                    </a>
                                    <a href="#" className="text-gray-400 hover:text-brand-blue transition-colors">
                                        <Linkedin className="w-8 h-8" />
                                    </a>
                                    <a href="#" className="text-gray-400 hover:text-brand-blue transition-colors">
                                        <Twitter className="w-8 h-8" />
                                    </a>
                                </div>
                            </div>
                        </div>

                        {/* Map Placeholder */}
                        <div className="mt-8 h-64 bg-gray-100 rounded-xl overflow-hidden relative group">
                            <iframe
                                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2848.846142749712!2d26.09630327663456!3d44.43635310167576!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x40b1ff442e946a49%3A0xe549cd97b973562e!2sPia%C8%9Ba%20Universit%C4%83%C8%9Bii!5e0!3m2!1sen!2sro!4v1709825638575!5m2!1sen!2sro"
                                width="100%"
                                height="100%"
                                style={{ border: 0 }}
                                allowFullScreen
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                            ></iframe>
                            <div className="absolute inset-x-0 bottom-4 text-center pointer-events-none">
                                <span className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium text-gray-700 shadow-sm">
                                    Afișați harta mărită
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Contact Form Column */}
                    <div className="bg-white rounded-2xl shadow-xl p-8">
                        <div className="mb-8">
                            <h2 className="text-3xl font-bold text-gray-900">Trimiteți-ne un mesaj</h2>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                                    Nume <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    required
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-shadow outline-none"
                                    placeholder="Numele dvs. complet"
                                />
                            </div>

                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                    Email <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    required
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-shadow outline-none"
                                    placeholder="adresa.dvs@email.com"
                                />
                            </div>

                            <div>
                                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                                    Mesaj <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    id="message"
                                    name="message"
                                    required
                                    rows={6}
                                    value={formData.message}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-shadow outline-none resize-none"
                                    placeholder="Mesajul dvs."
                                ></textarea>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 font-semibold py-4 px-6 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 shadow-sm"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>Se trimite...</span>
                                    </>
                                ) : (
                                    <span>Trimite Mesaj</span>
                                )}
                            </button>

                            <p className="text-xs text-gray-500 text-center mt-4">
                                Acest site este protejat de reCAPTCHA și se aplică{' '}
                                <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-brand-blue hover:underline">
                                    Politica de confidențialitate
                                </a>{' '}
                                și{' '}
                                <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="text-brand-blue hover:underline">
                                    Termenii și condițiile
                                </a>{' '}
                                Google.
                            </p>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContactPage;
