import React from 'react';

interface AdvertisementProps {
  imageSrc: string;
  altText: string;
}

const Advertisement: React.FC<AdvertisementProps> = ({ imageSrc, altText }) => {
  return (
    <div className="p-2 mt-4 border-t border-gray-200">
      <p className="text-xs text-gray-500 mb-2 text-center">Publicitate</p>
      <div className="border border-gray-300 rounded-lg overflow-hidden">
        <img src={imageSrc} alt={altText} className="w-full h-auto object-cover" />
      </div>
    </div>
  );
};

export default Advertisement;
