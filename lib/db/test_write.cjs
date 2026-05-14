const pg = require('pg');
const client = new pg.Client('postgresql://postgres:Lider20201835@db.jwslaxyqmwzfvfxuvefz.supabase.co:5432/postgres?sslmode=require');
client.connect().then(async () => {
    try {
        await client.query("INSERT INTO trucks (nae, type, status) VALUES ('TEST-NAE', 'test', 'active')");
        console.log('Prueba de escritura: EXITOSA');
        await client.query("DELETE FROM trucks WHERE nae = 'TEST-NAE'");
    } catch (e) {
        console.error('Error de escritura:', e.message);
    }
    process.exit(0);
}).catch(err => {
    console.error('Error de conexión:', err.message);
    process.exit(1);
});
