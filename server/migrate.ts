import { initDatabase } from './db.js';

const ready = await initDatabase();
if (!ready) {
  throw new Error('DATABASE_URL não está disponível para executar a migração.');
}
console.log('Banco Casas Angra pronto.');
process.exit(0);
