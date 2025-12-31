import React from 'react';

interface AdvertisementProps {
  imageSrc: string;
  altText: string;
  link?: string;
}

const Advertisement: React.FC<AdvertisementProps> = ({ imageSrc, altText, link }) => {
  const imageContent = (
    <img
      src={imageSrc}
      alt={altText}
      className="w-full h-auto object-contain opacity-90 hover:opacity-100 transition-opacity"
      style={{ aspectRatio: '4/3' }}
    />
  );

  return (
    <div className="my-6">
      <div className="bg-gray-50 rounded-lg overflow-hidden border border-gray-100 p-4">
        <div className="max-w-[240px] mx-auto">
          {link ? (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="block hover:opacity-80 transition-opacity"
            >
              {imageContent}
            </a>
          ) : (
            imageContent
          )}
        </div>
      </div>
      <p className="text-[10px] text-gray-400 text-center mt-2 uppercase tracking-widest">Parteneri</p>
    </div>
  );
};

export default Advertisement;
