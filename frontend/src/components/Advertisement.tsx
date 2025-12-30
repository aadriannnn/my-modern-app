import React from 'react';

interface AdvertisementProps {
  imageSrc: string;
  altText: string;
}

const Advertisement: React.FC<AdvertisementProps> = ({ imageSrc, altText }) => {
  return (
    <div className="my-6">
      <div className="bg-gray-50 rounded-lg overflow-hidden border border-gray-100">
        <img src={imageSrc} alt={altText} className="w-full h-auto object-cover opacity-90 hover:opacity-100 transition-opacity" />
      </div>
      <p className="text-[10px] text-gray-400 text-center mt-2 uppercase tracking-widest">Parteneri</p>
    </div>
  );
};

export default Advertisement;
