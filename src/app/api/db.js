import { Pool } from 'pg';

let pool = null;
let schemaReady = null;

function getPool() {
    if (pool) return pool;

    const DATABASE_URL = process.env.DATABASE_URL;
    if (!DATABASE_URL) {
        throw new Error('DATABASE_URL environment variable is required');
    }

    pool = new Pool({
        connectionString: DATABASE_URL,
    });

    return pool;
}

async function ensureSchemaUnsafe() {
    const activePool = getPool();
    await activePool.query(`
        CREATE TABLE IF NOT EXISTS instances (
            id SERIAL PRIMARY KEY,
            container_name TEXT NOT NULL,
            interface_name TEXT NOT NULL DEFAULT 'wg0',
            server_private_key TEXT NOT NULL,
            server_public_key TEXT NOT NULL,
            server_address TEXT NOT NULL,
            server_endpoint TEXT NOT NULL,
            server_listen_port INTEGER NOT NULL DEFAULT 51820,
            dns TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    `);

    await activePool.query(`
        CREATE TABLE IF NOT EXISTS clients (
            id SERIAL PRIMARY KEY,
            instance_id INTEGER NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
            description TEXT NOT NULL,
            client_ip CIDR NOT NULL,
            allowed_ips TEXT NOT NULL DEFAULT '0.0.0.0/0',
            public_key TEXT NOT NULL,
            private_key TEXT,
            psk TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    `);

    await activePool.query(`CREATE INDEX IF NOT EXISTS idx_clients_instance_id ON clients(instance_id);`);
    await activePool.query(`CREATE INDEX IF NOT EXISTS idx_clients_public_key ON clients(public_key);`);
}

export async function ensureSchema() {
    if (schemaReady) return schemaReady;
    schemaReady = ensureSchemaUnsafe();
    return schemaReady;
}

export async function query(text, params) {
    await ensureSchema();
    return getPool().query(text, params);
}

export async function closePool() {
    if (pool) {
        await pool.end();
        pool = null;
    }
}
