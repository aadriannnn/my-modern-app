import React from 'react';
import { User, Linkedin, Globe } from 'lucide-react';
import { type LegalNewsAuthor } from '../../types/news';

interface AuthorCardProps {
    author: LegalNewsAuthor;
}

const AuthorCard: React.FC<AuthorCardProps> = ({ author }) => {
    return (
        <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all p-6 border border-gray-100 flex flex-col items-center text-center group">
            <div className="w-24 h-24 rounded-full bg-gray-100 mb-4 overflow-hidden border-2 border-brand-light group-hover:border-brand-accent transition-colors">
                {author.profileImageUrl ? (
                    <img
                        src={`/api/uploads/${author.profileImageUrl}`}
                        alt={author.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(author.name);
                        }}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <User size={32} />
                    </div>
                )}
            </div>

            <h3 className="text-lg font-bold text-gray-900 mb-1">{author.name}</h3>
            <p className="text-brand-primary text-sm font-medium mb-3">{author.title || "Contributor Legal"}</p>

            <p className="text-gray-500 text-sm mb-4 line-clamp-3">
                {author.bio || "Expert juridic cu experiență în dreptul românesc și european."}
            </p>

            <div className="mt-auto flex space-x-3">
                {author.profileUrl && (
                    <a
                        href={author.profileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-brand-primary transition-colors"
                    >
                        <Globe size={18} />
                    </a>
                )}
                {/* Placeholder social icons as they might not be in DB yet */}
                <button className="text-gray-400 hover:text-[#0077b5] transition-colors">
                    <Linkedin size={18} />
                </button>
            </div>
        </div>
    );
};

export default AuthorCard;
