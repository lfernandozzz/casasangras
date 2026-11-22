import app, { databaseInitialization } from './index.js';

const port = Number(process.env.PORT ?? 3000);
await databaseInitialization;
app.listen(port, '0.0.0.0', () => console.log(`Casas Angra server listening on ${port}`));
