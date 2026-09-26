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
    load_balancer_ip TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE INDEX IF NOT EXISTS idx_clients_instance_id ON clients(instance_id);
CREATE INDEX IF NOT EXISTS idx_clients_public_key ON clients(public_key);
