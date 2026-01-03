import React from 'react';
import { MapPin, Clock, Briefcase } from 'lucide-react';

interface Job {
    id: string;
    title: string;
    company: string;
    location?: string;
    datePosted: string | Date;
    salary?: string; // Optional field if available in data
    companyLogo?: string;
    applyLink?: string;
}

interface JobCardProps {
    job: Job;
}

const JobCard: React.FC<JobCardProps> = ({ job }) => {
    const { title, company, location, datePosted, salary, companyLogo, applyLink } = job;

    const dateObj = new Date(datePosted);
    const formattedDate = dateObj.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' });

    return (
        <div className="bg-white rounded-lg border border-slate-100 p-6 flex flex-col md:flex-row items-start md:items-center gap-6 hover:shadow-md transition-shadow duration-300">
            {/* Logo */}
            <div className="w-14 h-14 flex-shrink-0 bg-slate-50 rounded-full flex items-center justify-center border border-slate-200 overflow-hidden">
                {companyLogo ? (
                    <img src={companyLogo} alt={company} className="w-full h-full object-cover" />
                ) : (
                    <Briefcase className="w-6 h-6 text-slate-400" />
                )}
            </div>

            {/* Content */}
            <div className="flex-grow min-w-0">
                <h3 className="text-lg font-bold text-slate-900 mb-1">{title}</h3>
                <div className="text-sm font-medium text-slate-600 mb-2">{company}</div>

                <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                    {location && (
                        <div className="flex items-center gap-1.5">
                            <MapPin className="w-4 h-4 text-slate-400" />
                            <span>{location}</span>
                        </div>
                    )}
                    {salary && (
                        <div className="text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded">
                            {salary}
                        </div>
                    )}
                </div>
            </div>

            {/* Action / Meta */}
            <div className="flex flex-col items-end gap-3 flex-shrink-0 w-full md:w-auto mt-2 md:mt-0">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formattedDate}</span>
                </div>

                <a
                    href={applyLink || "#"}
                    className="w-full md:w-auto px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg flex items-center justify-center transition-colors shadow-sm"
                >
                    Aplică rapid
                </a>
            </div>
        </div>
    );
};

export default JobCard;
