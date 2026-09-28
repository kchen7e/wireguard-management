import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/app/api/db.js', () => ({
    query: vi.fn(),
}));

vi.mock('../src/app/api/lib/kubectl.js', () => ({
    runKubectl: vi.fn(async () => ({ stdout: '', stderr: '' })),
}));

vi.mock('../src/app/api/lib/fs.js', () => ({
    atomicWriteFile: vi.fn(async () => {}),
}));

import { query } from '../src/app/api/db.js';
import { atomicWriteFile } from '../src/app/api/lib/fs.js';
import { runKubectl } from '../src/app/api/lib/kubectl.js';
import { reloadInstanceById } from '../src/app/api/lib/instance.js';

const instance = {
    id: 7,
    container_name: 'wireguard-7',
    interface_name: 'wg0',
    server_private_key: 'server-priv',
    server_public_key: 'server-pub',
    server_vpn_ip: '172.28.15.0/24',
    server_endpoint: 'wg.storm7e.de',
    server_listen_port: 51820,
    dns: null,
    load_balancer_ip: null,
};

const deletedPeerKey = 'DELETED-CLIENT-PUBKEY';
const remainingClient = {
    id: 12,
    description: 'Alice',
    client_ip: '172.28.15.2/32',
    allowed_ips: '0.0.0.0/0',
    public_key: 'ALICE-PUBKEY',
    private_key: 'alice-priv',
    psk: 'psk',
};

describe('client delete -> reload flow', () => {
    beforeEach(() => {
        query.mockReset();
        atomicWriteFile.mockReset();
        runKubectl.mockReset();
    });

    it('removes the deleted peer from the correct instance manifest file', async () => {
        query.mockImplementation(async (sql) => {
            if (sql.includes('FROM instances WHERE id = $1')) {
                return { rowCount: 1, rows: [instance] };
            }
            if (sql.includes('FROM clients WHERE instance_id = $1')) {
                return { rowCount: 1, rows: [remainingClient] };
            }
            throw new Error(`Unexpected query: ${sql}`);
        });

        await reloadInstanceById(7);

        expect(atomicWriteFile).toHaveBeenCalledTimes(1);
        const [filePath, content] = atomicWriteFile.mock.calls[0];

        expect(filePath).toContain('wg-7.yaml');

        const base64Match = content.match(/wg0\.conf:\s*(\S+)/);
        expect(base64Match).not.toBeNull();
        const wgConf = Buffer.from(base64Match[1], 'base64').toString('utf8');

        expect(wgConf).toContain('ALICE-PUBKEY');
        expect(wgConf).not.toContain(deletedPeerKey);

        expect(runKubectl).toHaveBeenCalledWith(['apply', '-f', filePath]);
        expect(runKubectl).toHaveBeenCalledWith(['rollout', 'restart', '-n', 'wireguard', 'deployment/wg-7']);
    });
});
