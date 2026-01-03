// import React from 'react';
import { Link } from 'react-router-dom';

const LegalNewsFooter = () => {
    const currentYear = new Date().getFullYear();

    const policyLinks = [
        { name: 'Politica de Confidențialitate', path: '/stiri/politica-confidentialitate' },
        { name: 'Politica Editorială', path: '/stiri/politica-editoriala' },
        { name: 'Termeni și Condiții de Utilizare', path: '/stiri/termeni-conditii' },
        { name: 'Condiții de Publicare', path: '/stiri/conditii-publicare' },
    ];

    const aboutLinks = [
        { name: 'Despre Noi', path: '/stiri/despre-noi' },
        { name: 'Contact', path: '/stiri/contact' },
    ];

    interface LinkItem {
        name: string;
        path: string;
    }

    const FooterLinkList = ({ title, links }: { title: string, links: LinkItem[] }) => (
        <div className="flex flex-col space-y-3 sm:items-start items-center text-center sm:text-left">
            <h4 className="border-b border-white/20 pb-2 mb-1 text-sm font-semibold inline-block">
                {title}
            </h4>
            {links.map(link => (
                <Link
                    key={link.name}
                    to={link.path}
                    className="block text-sm hover:text-white transition-colors"
                >
                    {link.name}
                </Link>
            ))}
        </div>
    );

    return (
        <footer className="bg-gray-900 text-gray-300 pt-10 md:pt-16 pb-0">
            <div className="mx-auto max-w-[1200px] px-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 md:gap-10">
                    <FooterLinkList title="Politici" links={policyLinks} />

                    <FooterLinkList title="Companie" links={aboutLinks} />

                    <div className="flex flex-col space-y-2 mt-4 sm:mt-0 items-center sm:items-start text-center sm:text-left">
                        <h5 className="text-md font-bold text-white">
                            LegeaAplicata.ro
                        </h5>
                        <p className="text-sm pt-4">
                            &copy; {currentYear} Toate drepturile rezervate.
                        </p>
                        <p className="text-sm">
                            Un proiect{' '}
                            <a
                                href="https://www.verdictline.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-blue-300 hover:text-blue-200"
                            >
                                Verdict Line
                            </a>.
                        </p>
                    </div>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="mt-8 md:mt-12 py-4 bg-black/30">
                <div className="mx-auto max-w-[1200px] px-4">
                    <div className="flex flex-col sm:flex-row justify-center items-center text-center">
                        <p className="text-xs text-gray-400">
                            Platformă Știri Juridice LegeaAplicata
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default LegalNewsFooter;
