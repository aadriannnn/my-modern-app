import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { NewsApi } from '../../lib/api-news';
import { type LegalNewsJob } from '../../types/news';
import JobCard from '../../components/LegalNews/JobCard';
import JobFilters from '../../components/LegalNews/JobFilters';

const JobsSection: React.FC = () => {
    const [jobs, setJobs] = useState<LegalNewsJob[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                const data = await NewsApi.getJobs();
                setJobs(data);
            } catch (err) {
                console.error("Failed to load jobs", err);
                setError("Nu am putut încărca anunțurile de angajare.");
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    if (loading) {
        return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-brand-accent w-8 h-8" /></div>;
    }

    if (error) {
        return <div className="text-center text-red-500 p-8">{error}</div>;
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-8 font-headings border-b border-orange-500 inline-block pb-1">
                Locuri de muncă ({jobs.length})
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Filters Sidebar */}
                <div className="lg:col-span-1">
                    <JobFilters />
                </div>

                {/* Jobs List */}
                <div className="lg:col-span-3 space-y-4">
                    {jobs.map(job => (
                        <JobCard key={job.id} job={job} />
                    ))}

                    {jobs.length === 0 && (
                        <div className="text-center py-12 text-gray-500 bg-white rounded-xl border border-gray-100">
                            Nu există anunțuri de angajare active momentan.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default JobsSection;
