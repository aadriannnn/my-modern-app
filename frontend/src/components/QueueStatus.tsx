import React from 'react';
import './QueueStatus.css';

interface QueueStatusProps {
    position: number;
    total: number;
    status: 'queued' | 'processing' | 'completed' | 'error';
}

const QueueStatus: React.FC<QueueStatusProps> = ({ position, total, status }) => {
    if (status === 'completed' || status === 'error') {
        return null;
    }

    const isProcessing = position === 0 || status === 'processing';

    return (
        <div className="queue-status-container">
            <div className="queue-status-card">
                {/* Loading Animation */}
                <div className="queue-loader">
                    <div className="spinner">
                        <div className="spinner-ring"></div>
                        <div className="spinner-ring"></div>
                        <div className="spinner-ring"></div>
                    </div>
                </div>

                {/* Queue Position */}
                <div className="queue-info">
                    {isProcessing ? (
                        <>
                            <h3 className="queue-title">Se procesează cererea...</h3>
                            <p className="queue-subtitle">
                                Generăm embedding-urile și căutăm în baza de date
                            </p>
                        </>
                    ) : (
                        <>
                            <h3 className="queue-title">
                                Poziția <span className="queue-position-number">{position}</span> în coadă
                            </h3>
                            <p className="queue-subtitle">
                                {total > 1 ? `${total - 1} ${total - 1 === 1 ? 'cerere' : 'cereri'} înaintea dumneavoastră` : 'Următorul la procesare'}
                            </p>
                        </>
                    )}

                    <p className="queue-message">
                        Vă rugăm să aveți răbdare, analizăm cererea dumneavoastră...
                    </p>
                </div>
            </div>
        </div>
    );
};

export default QueueStatus;
