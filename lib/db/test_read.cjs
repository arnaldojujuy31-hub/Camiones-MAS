const pg = require('pg');
const client = new pg.Client({
    connectionString: 'postgresql://postgres:Lider20201835@db.jwslaxyqmwzfvfxuvefz.supabase.co:5432/postgres?sslmode=require',
    ssl: { rejectUnauthorized: false }
});
client.connect().then(async () => {
    try {
        const res = await client.query("SELECT * FROM trucks");
        console.log('Consulta EXITOSA, filas:', res.rowCount);
    } catch (e) {
        console.error('Error de consulta:', e.message);
    }
    process.exit(0);
}).catch(err => {
    console.error('Error de conexión:', err.message);
    process.exit(1);
});
