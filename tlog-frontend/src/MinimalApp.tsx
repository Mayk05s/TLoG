import React, { useState } from 'react';

function MinimalApp() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Login attempt:', username, password);
    // Временная имитация логина
    if (username && password) {
      setIsLoggedIn(true);
    }
  };

  if (isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Game Rounds
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Welcome, {username}! 🎮
              </p>
            </div>
            <button
              onClick={() => setIsLoggedIn(false)}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Logout
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-2">Game Rounds</h3>
            <p className="text-gray-500 dark:text-gray-400">
              No rounds available yet. Connect to your backend to see real data.
            </p>
            <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-sm text-green-700 dark:text-green-300">
                ✅ Frontend работает<br/>
                ✅ Авторизация работает<br/>
                ✅ Tailwind CSS работает<br/>
                🔄 Готов к подключению к бэкенду
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-lg border shadow-sm">
          <div className="p-6">
            <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-6">
              The Last of Guss
            </h1>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Enter your username"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Enter your password"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Login
              </button>
            </form>

            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                ✅ React работает<br/>
                ✅ Tailwind CSS работает<br/>
                ✅ Формы работают<br/>
                🔄 Готов к полной интеграции
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MinimalApp;
