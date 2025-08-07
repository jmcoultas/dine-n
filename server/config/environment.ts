interface EnvironmentConfig {
  nodeEnv: string;
  isProduction: boolean;
  isDevelopment: boolean;
  
  // Base URLs
  baseUrl: string;
  clientUrl: string;
  
  // API Keys
  openaiApiKey: string;
  instacartApiKey: string;
  stripeSecretKey: string;
  stripePriceId?: string;
  
  // Firebase
  firebaseProjectId: string;
  firebaseClientEmail: string;
  firebasePrivateKey: string;
  
  // Cloudinary
  cloudinaryCloudName: string;
  cloudinaryApiKey: string;
  cloudinaryApiSecret: string;
  
  // Database
  databaseUrl: string;
}

function getEnvironmentVariable(devKey: string, prodKey: string): string {
  const isProduction = process.env.NODE_ENV === 'production';
  const key = isProduction ? prodKey : devKey;
  const value = process.env[key];
  
  if (!value) {
    console.warn(`Missing environment variable: ${key}`);
    // Fallback to the current single key if dev/prod specific keys don't exist
    const fallbackKey = devKey.replace('_DEV', '').replace('_TEST', '');
    return process.env[fallbackKey] || '';
  }
  
  return value;
}

export const config: EnvironmentConfig = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production' || process.env.REPLIT_DEPLOYMENT === 'true',
  isDevelopment: process.env.NODE_ENV !== 'production' && process.env.REPLIT_DEPLOYMENT !== 'true',
  
  // Base URLs
  baseUrl: process.env.NODE_ENV === 'production' ? 'https://dinen.ai' : 'http://localhost:3001',
  clientUrl: process.env.NODE_ENV === 'production' ? 'https://dinen.ai' : 'http://localhost:5173',
  
  // API Keys - automatically select dev or prod versions
  openaiApiKey: getEnvironmentVariable('OPENAI_API_KEY_DEV', 'OPENAI_API_KEY_PROD'),
  instacartApiKey: process.env.INSTACART_TEST_KEY || getEnvironmentVariable('INSTACART_API_KEY_DEV', 'INSTACART_API_KEY_PROD'),
  stripeSecretKey: getEnvironmentVariable('STRIPE_SECRET_KEY_DEV', 'STRIPE_SECRET_KEY_PROD'),
  stripePriceId: process.env.STRIPE_PRICE_ID,
  
  // Firebase
  firebaseProjectId: getEnvironmentVariable('FIREBASE_PROJECT_ID_DEV', 'FIREBASE_PROJECT_ID_PROD'),
  firebaseClientEmail: getEnvironmentVariable('FIREBASE_CLIENT_EMAIL_DEV', 'FIREBASE_CLIENT_EMAIL_PROD'),
  firebasePrivateKey: getEnvironmentVariable('FIREBASE_PRIVATE_KEY_DEV', 'FIREBASE_PRIVATE_KEY_PROD'),
  
  // Cloudinary
  cloudinaryCloudName: getEnvironmentVariable('CLOUDINARY_CLOUD_NAME_DEV', 'CLOUDINARY_CLOUD_NAME_PROD'),
  cloudinaryApiKey: getEnvironmentVariable('CLOUDINARY_API_KEY_DEV', 'CLOUDINARY_API_KEY_PROD'),
  cloudinaryApiSecret: getEnvironmentVariable('CLOUDINARY_API_SECRET_DEV', 'CLOUDINARY_API_SECRET_PROD'),
  
  // Database
  databaseUrl: getEnvironmentVariable('DATABASE_URL_DEV', 'DATABASE_URL_PROD'),
};

// Log configuration on startup (without sensitive values)
console.log('Environment Configuration:', {
  nodeEnv: config.nodeEnv,
  isProduction: config.isProduction,
  isDevelopment: config.isDevelopment,
  hasOpenaiKey: !!config.openaiApiKey,
  hasInstacartKey: !!config.instacartApiKey,
  hasStripeKey: !!config.stripeSecretKey,
  hasFirebaseConfig: !!(config.firebaseProjectId && config.firebaseClientEmail && config.firebasePrivateKey),
  hasCloudinaryConfig: !!(config.cloudinaryCloudName && config.cloudinaryApiKey && config.cloudinaryApiSecret),
  hasDatabaseUrl: !!config.databaseUrl,
  // Debug database URL selection
  databaseUrlSource: config.isProduction ? 'DATABASE_URL_PROD' : 'DATABASE_URL_DEV',
  databaseUrlFound: config.isProduction ? !!process.env.DATABASE_URL_PROD : !!process.env.DATABASE_URL_DEV,
  fallbackDatabaseUrl: !!process.env.DATABASE_URL,
}); 