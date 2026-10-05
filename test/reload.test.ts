import { describe, it, expect } from 'vitest';
import { mkdtemp, readFile, readdir, rm } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import { atomicWriteFile } from '../src/app/api/lib/fs';
import { verifyPeers } from '../src/app/api/lib/instance';

describe('atomicWriteFile', () => {
    it('writes content and leaves no temp files behind', async () => {
        const dir = await mkdtemp(path.join(tmpdir(), 'wg-gui-'));
        const file = path.join(dir, 'wg0.conf');
        await atomicWriteFile(file, '[Interface]\n');
        expect(await readFile(file, 'utf8')).toBe('[Interface]\n');
        expect(await readdir(dir)).toEqual(['wg0.conf']);
        await rm(dir, { recursive: true, force: true });
    });

    it('atomically overwrites an existing file', async () => {
        const dir = await mkdtemp(path.join(tmpdir(), 'wg-gui-'));
        const file = path.join(dir, 'wg0.conf');
        await atomicWriteFile(file, 'old');
        await atomicWriteFile(file, 'new');
        expect(await readFile(file, 'utf8')).toBe('new');
        expect(await readdir(dir)).toEqual(['wg0.conf']);
        await rm(dir, { recursive: true, force: true });
    });
});

describe('verifyPeers', () => {
    const dump = ['AAA\t(none)\t10.13.13.2/32', 'BBB\t(none)\t10.13.13.3/32', ''].join('\n');

    it('reports applied when the peer set matches', () => {
        const clients = [{ public_key: 'AAA' }, { public_key: 'BBB' }];
        const result = verifyPeers(dump, clients);
        expect(result.status).toBe('applied');
        expect(result.missing).toEqual([]);
        expect(result.extra).toEqual([]);
    });

    it('reports mismatch with missing and extra peers', () => {
        const clients = [{ public_key: 'AAA' }, { public_key: 'CCC' }];
        const result = verifyPeers(dump, clients);
        expect(result.status).toBe('mismatch');
        expect(result.missing).toEqual(['CCC']);
        expect(result.extra).toEqual(['BBB']);
    });
});
