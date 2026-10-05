// Shared domain types used across the API and the UI.

export type LbMode = 'shared' | 'dedicated';

export interface Instance {
    id: number;
    container_name: string;
    interface_name: string;
    server_private_key: string;
    server_public_key: string;
    server_vpn_ip: string;
    server_endpoint: string;
    server_listen_port: number;
    dns: string | null;
    load_balancer_ip: string | null;
    created_at?: string;
    updated_at?: string;
}

export interface Client {
    id: number;
    description: string;
    client_ip: string;
    allowed_ips: string;
    public_key: string;
    private_key?: string | null;
    psk?: string | null;
}

// A client row selected with its instance_id (e.g. getClientById), as opposed to
// the per-instance listing which omits it.
export interface ClientRecord extends Client {
    instance_id: number;
}

export interface WgPeerStatus {
    endpoint: string | null;
    last_handshake: number | null;
    transfer_rx: number;
    transfer_tx: number;
}

export interface ClientStatus extends WgPeerStatus {
    id: number;
    public_key: string;
}

// A client with its live status merged in (the status is absent until the first
// poll returns).
export type ClientWithStatus = Client & Partial<WgPeerStatus>;
