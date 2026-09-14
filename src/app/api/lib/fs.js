import { promises as fs } from 'fs';
import { randomBytes } from 'crypto';
import path from 'path';

export async function atomicWriteFile(filePath, content) {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    const tmpPath = path.join(dir, `.${path.basename(filePath)}.${randomBytes(6).toString('hex')}.tmp`);
    try {
        await fs.writeFile(tmpPath, content, 'utf8');
        await fs.rename(tmpPath, filePath);
    } catch (error) {
        await fs.unlink(tmpPath).catch(() => {});
        throw error;
    }
}
