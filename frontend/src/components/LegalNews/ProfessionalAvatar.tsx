import React from 'react';
import { Link } from 'react-router-dom';
import { User } from 'lucide-react';

interface Author {
    id: string;
    name: string;
    profileImageUrl?: string;
}

interface ProfessionalAvatarProps {
    author: Author;
}

const ProfessionalAvatar: React.FC<ProfessionalAvatarProps> = ({ author }) => {
    const { id, name, profileImageUrl } = author;
    const profileLink = `/stiri/autor/${id}`;

    return (
        <div className="flex flex-col items-center group">
            <Link to={profileLink} className="relative block mb-3">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-white shadow-md group-hover:border-blue-500 transition-colors duration-300">
                    {profileImageUrl ? (
                        <img
                            src={profileImageUrl}
                            alt={name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-400">
                            <User className="w-10 h-10" />
                        </div>
                    )}
                </div>
            </Link>
            <Link to={profileLink} className="text-center group-hover:text-blue-700 transition-colors">
                <h4 className="text-sm font-semibold text-slate-900 leading-tight px-1 line-clamp-2">
                    {name}
                </h4>
            </Link>
        </div>
    );
};

export default ProfessionalAvatar;
