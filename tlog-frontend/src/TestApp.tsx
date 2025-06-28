import React from 'react';

function TestApp() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          The Last of Guss - Frontend Test
        </h1>
        <p className="text-gray-600">
          Если вы видите это сообщение, значит React работает корректно.
        </p>
        <div className="mt-4 p-4 bg-blue-50 rounded">
          <p className="text-sm text-blue-700">
            ✅ React монтируется<br/>
            ✅ Tailwind CSS работает<br/>
            ✅ TypeScript компилируется
          </p>
        </div>
      </div>
    </div>
  );
}

export default TestApp;
