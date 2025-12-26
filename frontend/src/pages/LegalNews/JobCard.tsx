import React from 'react';
import { Briefcase, MapPin, Clock, ExternalLink } from 'lucide-react';
import { type LegalNewsJob } from '../../types/news';

interface JobCardProps {
    job: LegalNewsJob;
}

const JobCard: React.FC<JobCardProps> = ({ job }) => {
    const postDate = new Date(job.datePosted).toLocaleDateString('ro-RO');

    return (
        <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all p-6 border border-gray-100 flex flex-col md:flex-row md:items-start gap-4">
            <div className="w-12 h-12 bg-brand-light rounded-lg flex items-center justify-center text-brand-primary flex-shrink-0">
                <Briefcase size={24} />
            </div>

            <div className="flex-grow">
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2 mb-2">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">{job.title}</h3>
                        <p className="text-brand-primary font-medium">{job.company}</p>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Activ
                    </span>
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-4">
                    {job.location && (
                        <div className="flex items-center">
                            <MapPin size={14} className="mr-1" />
                            {job.location}
                        </div>
                    )}
                    <div className="flex items-center">
                        <Clock size={14} className="mr-1" />
                        Postat: {postDate}
                    </div>
                </div>

                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {job.description}
                </p>

                {job.requirements && job.requirements.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                        {job.requirements.slice(0, 3).map((req, idx) => (
                            <span key={idx} className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">
                                {req}
                            </span>
                        ))}
                        {job.requirements.length > 3 && (
                            <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">
                                +{job.requirements.length - 3}
                            </span>
                        )}
                    </div>
                )}
            </div>

            <div className="flex-shrink-0 md:self-center">
                <button className="w-full md:w-auto px-4 py-2 bg-white border border-brand-primary text-brand-primary rounded-lg hover:bg-brand-primary hover:text-white transition-colors text-sm font-medium flex items-center justify-center">
                    Aplică Acum <ExternalLink size={14} className="ml-1.5" />
                </button>
            </div>
        </div>
    );
};

export default JobCard;
