import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { NewsApi } from '../../lib/api-news';
import { type LegalNewsJob } from '../../types/news';
import JobCard from './JobCard';

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
        return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-brand-accent" /></div>;
    }

    if (error) {
        return <div className="text-center text-red-500 p-8">{error}</div>;
    }

    return (
        <div className="space-y-4">
            {jobs.map(job => (
                <JobCard key={job.id} job={job} />
            ))}
            {jobs.length === 0 && (
                <div className="text-center py-12 text-gray-500 bg-white rounded-xl border border-gray-100">
                    Nu există anunțuri de angajare active momentan.
                </div>
            )}
        </div>
    );
};

export default JobsSection;
