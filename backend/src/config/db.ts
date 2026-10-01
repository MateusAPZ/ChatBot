import { Pool } from 'pg';
import { config } from './env';

export let isDbConnected = false;

const isSupabaseOrCloud = 
  config.databaseUrl.includes('supabase.co') || 
  config.databaseUrl.includes('supabase.com') ||
  config.databaseUrl.includes('pooler.supabase.com') ||
  config.databaseUrl.includes('sslmode=require') ||
  process.env.NODE_ENV === 'production' ||
  Boolean(process.env.VERCEL);

export const pool = new Pool({
  connectionString: config.databaseUrl,
  connectionTimeoutMillis: 5000,
  ssl: isSupabaseOrCloud ? { rejectUnauthorized: false } : undefined,
});

pool.on('error', (err) => {
  console.error('Erro inesperado no cliente PostgreSQL do pool:', err);
});

let connectionPromise: Promise<boolean> | null = null;

export async function testConnection(): Promise<boolean> {
  if (isDbConnected) return true;
  if (connectionPromise) return connectionPromise;

  connectionPromise = (async () => {
    try {
      const client = await pool.connect();
      const res = await client.query('SELECT NOW()');
      client.release();
      isDbConnected = true;
      console.log('✅ Conexão com o PostgreSQL estabelecida com sucesso:', res.rows[0].now);
      return true;
    } catch (err: any) {
      isDbConnected = false;
      console.warn('⚠️ Atenção: Não foi possível conectar ao PostgreSQL:', err.message);
      console.warn('💡 Usando armazenamento em memória temporário para permitir testes e uso imediato.');
      return false;
    } finally {
      connectionPromise = null;
    }
  })();

  return connectionPromise;
}
