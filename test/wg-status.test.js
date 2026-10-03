import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/app/api/lib/kubectl.js', () => ({
    runKubectl: vi.fn(async () => ({ stdout: '', stderr: '' })),
}));

import { runKubectl } from '../src/app/api/lib/kubectl.js';
import { getWgRealTimeData, parseWgDumpStatus } from '../src/app/api/lib/instance.js';

const instance = {
    id: 7,
    interface_name: 'wg0',
};

const clients = [
    { id: 12, public_key: 'AAA' },
    { id: 13, public_key: 'CCC' },
];

describe('parseWgDumpStatus', () => {
    it('parses handshake and transfer counters for each peer', () => {
        const dump = [
            'AAA\t(none)\t10.13.13.2:51820\t10.13.13.2/32\t1700000000\t1024\t2048\t25',
            'BBB\t(none)\t(none)\t10.13.13.3/32\t0\t0\t0\t25',
        ].join('\n');

        expect(parseWgDumpStatus(dump)).toEqual({
            AAA: { last_handshake: 1700000000, transfer_rx: 1024, transfer_tx: 2048 },
            BBB: { last_handshake: null, transfer_rx: 0, transfer_tx: 0 },
        });
    });

    it('ignores blank lines', () => {
        const dump = ['', '   ', 'AAA\t(none)\t(none)\t10.13.13.2/32\t5\t1\t2\t0', ''].join('\n');
        expect(parseWgDumpStatus(dump)).toEqual({
            AAA: { last_handshake: 5, transfer_rx: 1, transfer_tx: 2 },
        });
    });
});

describe('getWgRealTimeData', () => {
    beforeEach(() => {
        runKubectl.mockReset();
    });

    it('runs wg show dump against the instance deployment', async () => {
        runKubectl.mockResolvedValue({ stdout: '', stderr: '' });

        await getWgRealTimeData(instance, []);

        expect(runKubectl).toHaveBeenCalledWith([
            'exec',
            '-n',
            'wireguard',
            'deployment/wg-7',
            '--',
            'wg',
            'show',
            'wg0',
            'dump',
        ]);
    });

    it('maps dump status back onto clients by public key', async () => {
        runKubectl.mockResolvedValue({
            stdout: 'AAA\t(none)\t(none)\t10.13.13.2/32\t1700000000\t10\t20\t25\n',
            stderr: '',
        });

        const data = await getWgRealTimeData(instance, clients);

        expect(data).toEqual([
            { id: 12, public_key: 'AAA', last_handshake: 1700000000, transfer_rx: 10, transfer_tx: 20 },
            { id: 13, public_key: 'CCC', last_handshake: null, transfer_rx: 0, transfer_tx: 0 },
        ]);
    });

    it('returns null handshake and zero counters for missing peers', async () => {
        runKubectl.mockResolvedValue({ stdout: '', stderr: '' });

        const data = await getWgRealTimeData(instance, clients);

        expect(data).toEqual([
            { id: 12, public_key: 'AAA', last_handshake: null, transfer_rx: 0, transfer_tx: 0 },
            { id: 13, public_key: 'CCC', last_handshake: null, transfer_rx: 0, transfer_tx: 0 },
        ]);
    });
});
