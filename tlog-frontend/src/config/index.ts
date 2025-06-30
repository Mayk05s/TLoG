interface Config {
  API_BASE_URL: string;
}

const config: Config = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001',
};

export default config;
