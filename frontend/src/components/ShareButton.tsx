import React, { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { Share2, Mail, MessageCircle } from 'lucide-react';

interface ShareButtonProps {
  caseData: {
    titlu?: string;
    parte_introductiva?: string;
    considerente_speta?: string;
    dispozitiv_speta?: string;
    [key: string]: any;
  };
  className?: string;
}

const ShareButton: React.FC<ShareButtonProps> = ({ caseData, className = '' }) => {
  const generateShareText = () => {
    const title = caseData.titlu || 'Speță Legală';
    const intro = caseData.parte_introductiva ? `PARTE INTRODUCTIVĂ:\n${caseData.parte_introductiva}` : '';
    const considerations = caseData.considerente_speta ? `CONSIDERENTE:\n${caseData.considerente_speta}` : '';
    const decision = caseData.dispozitiv_speta ? `HOTĂRÂRE:\n${caseData.dispozitiv_speta}` : '';

    return `${title}\n\n${intro}\n\n${considerations}\n\n${decision}`.trim();
  };

  const handleEmailShare = () => {
    const subject = encodeURIComponent(`Speță: ${caseData.titlu || 'Detalii Speță'}`);
    const body = encodeURIComponent(generateShareText());
    window.open(`mailto:?subject=${subject}&body=${body}`, '_self');
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(generateShareText());
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <Menu as="div" className={`relative inline-block text-left ${className}`}>
      <div>
        <Menu.Button className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-brand-primary transition-colors relative group focus:outline-none">
          <Share2 size={18} />
          <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black text-white text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            Distribuie
          </span>
        </Menu.Button>
      </div>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 mt-2 w-40 origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
          <div className="px-1 py-1">
            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={handleEmailShare}
                  className={`${
                    active ? 'bg-brand-accent text-white' : 'text-gray-900'
                  } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                >
                  <Mail className="mr-2 h-4 w-4" aria-hidden="true" />
                  Email
                </button>
              )}
            </Menu.Item>
            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={handleWhatsAppShare}
                  className={`${
                    active ? 'bg-brand-accent text-white' : 'text-gray-900'
                  } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                >
                  <MessageCircle className="mr-2 h-4 w-4" aria-hidden="true" />
                  WhatsApp
                </button>
              )}
            </Menu.Item>
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
};

export default ShareButton;
