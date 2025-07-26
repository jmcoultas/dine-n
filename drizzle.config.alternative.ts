import { defineConfig } from "drizzle-kit";

// Parse connection string into individual components
const parseConnectionString = (url: string) => {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parsed.port ? parseInt(parsed.port) : 5432,
    user: parsed.username,
    password: parsed.password,
    database: parsed.pathname.slice(1), // Remove leading slash
    ssl: parsed.searchParams.get('sslmode') === 'require'
  };
};

// Support both new environment system and direct DATABASE_URL
const getDbUrl = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction && process.env.DATABASE_URL_PROD) {
    return process.env.DATABASE_URL_PROD;
  }
  
  if (!isProduction && process.env.DATABASE_URL_DEV) {
    return process.env.DATABASE_URL_DEV;
  }
  
  // Fallback to direct DATABASE_URL
  return process.env.DATABASE_URL;
};

const dbUrl = getDbUrl();

if (!dbUrl) {
  throw new Error('No database URL found. Please set DATABASE_URL, DATABASE_URL_DEV, or DATABASE_URL_PROD');
}

const dbConfig = parseConnectionString(dbUrl);

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database,
    ssl: dbConfig.ssl,
  },
  strict: true,
  verbose: true,
}); 