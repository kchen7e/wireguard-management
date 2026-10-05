import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/app/api/db', () => ({
    query: vi.fn(),
}));

vi.mock('../src/app/api/lib/kubectl', () => ({
    runKubectl: vi.fn(async () => ({ stdout: '', stderr: '' })),
}));

vi.mock('../src/app/api/lib/fs', () => ({
    atomicWriteFile: vi.fn(async () => {}),
}));

import { query } from '../src/app/api/db';
import { atomicWriteFile } from '../src/app/api/lib/fs';
import { runKubectl } from '../src/app/api/lib/kubectl';
import { reloadInstanceById } from '../src/app/api/lib/instance';

const mockedQuery = vi.mocked(query);
const mockedAtomicWriteFile = vi.mocked(atomicWriteFile);
const mockedRunKubectl = vi.mocked(runKubectl);

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
        mockedQuery.mockReset();
        mockedAtomicWriteFile.mockReset();
        mockedRunKubectl.mockReset();
    });

    it('removes the deleted peer from the correct instance manifest file', async () => {
        mockedQuery.mockImplementation(async (sql: string) => {
            if (sql.includes('FROM instances WHERE id = $1')) {
                return { rowCount: 1, rows: [instance] };
            }
            if (sql.includes('FROM clients WHERE instance_id = $1')) {
                return { rowCount: 1, rows: [remainingClient] };
            }
            throw new Error(`Unexpected query: ${sql}`);
        });

        await reloadInstanceById(7);

        expect(mockedAtomicWriteFile).toHaveBeenCalledTimes(1);
        const [filePath, content] = mockedAtomicWriteFile.mock.calls[0];

        expect(filePath).toContain('wg-7.yaml');

        const base64Match = content.match(/wg0\.conf:\s*(\S+)/);
        expect(base64Match).not.toBeNull();
        const wgConf = Buffer.from(base64Match![1], 'base64').toString('utf8');

        expect(wgConf).toContain('ALICE-PUBKEY');
        expect(wgConf).not.toContain(deletedPeerKey);

        expect(mockedRunKubectl).toHaveBeenCalledWith(['apply', '-f', filePath]);
        expect(mockedRunKubectl).toHaveBeenCalledWith(['rollout', 'restart', '-n', 'wireguard', 'deployment/wg-7']);
    });
});
