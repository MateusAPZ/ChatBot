import { Pool } from 'pg';
import { config } from './env';

export let isDbConnected = false;

export const pool = new Pool({
  connectionString: config.databaseUrl,
  connectionTimeoutMillis: 3000,
});

pool.on('error', (err) => {
  console.error('Erro inesperado no cliente PostgreSQL do pool:', err);
});

export async function testConnection(): Promise<boolean> {
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
    console.warn('   Assim que o PostgreSQL for iniciado, configure DATABASE_URL no backend/.env para persistência contínua.');
    return false;
  }
}
