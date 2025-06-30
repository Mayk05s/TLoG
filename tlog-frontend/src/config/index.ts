interface Config {
  API_BASE_URL: string;
  isDevelopment: boolean;
  isProduction: boolean;
}

const config: Config = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
};

if (config.isDevelopment) {
  console.log('🔧 Frontend Config:', {
    API_BASE_URL: config.API_BASE_URL,
    ENV_VARIABLE: import.meta.env.VITE_API_BASE_URL,
    MODE: import.meta.env.MODE,
  });
}

export default config;
