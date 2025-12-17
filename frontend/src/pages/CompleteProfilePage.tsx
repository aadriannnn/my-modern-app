import { useAuth } from '../context/AuthContext';


const CompleteProfilePage = () => {
    const { user } = useAuth();

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="max-w-md w-full bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg">
                <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Complete Your Profile</h2>
                <p className="text-gray-600 dark:text-gray-300 mb-4">Hello {user?.email}, please complete your profile information.</p>
                {/* Add form here for extra fields like phone, function, etc. */}
                <button
                    onClick={() => window.location.href = '/'}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                    Skip for now
                </button>
            </div>
        </div>
    );
};

export default CompleteProfilePage;
