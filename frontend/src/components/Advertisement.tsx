import React from 'react';

interface AdvertisementProps {
  imageSrc: string;
  altText: string;
}

const Advertisement: React.FC<AdvertisementProps> = ({ imageSrc, altText }) => {
  return (
    <div className="my-4 p-2 bg-white rounded-lg shadow-sm border border-gray-200">
      <img src={imageSrc} alt={altText} className="w-full h-auto rounded-md" />
    </div>
  );
};

export default Advertisement;
