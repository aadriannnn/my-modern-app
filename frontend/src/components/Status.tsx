import React from 'react';

interface StatusProps {
  message: string;
}

const Status: React.FC<StatusProps> = ({ message }) => {
  return (
    <div className="fixed bottom-0 left-0 w-full bg-gray-200 p-2">
      <p>{message}</p>
    </div>
  );
};

export default Status;
