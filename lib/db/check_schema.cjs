const pg = require('pg');
const client = new pg.Client('postgresql://postgres:Lider20201835@db.jwslaxyqmwzfvfxuvefz.supabase.co:5432/postgres');
client.connect().then(async () => {
    const res = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'trucks'");
    console.log(JSON.stringify(res.rows, null, 2));
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
