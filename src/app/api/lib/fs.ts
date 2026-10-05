import { promises as fs } from 'fs';
import { randomBytes } from 'crypto';
import path from 'path';
import { logger } from './logger';

export async function atomicWriteFile(filePath: string, content: string): Promise<void> {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    const tmpPath = path.join(dir, `.${path.basename(filePath)}.${randomBytes(6).toString('hex')}.tmp`);
    try {
        logger.debug('Writing file', { filePath });
        await fs.writeFile(tmpPath, content, 'utf8');
        await fs.rename(tmpPath, filePath);
    } catch (error) {
        logger.debug('Write failed', { filePath, error });
        await fs.unlink(tmpPath).catch(() => {});
        throw error;
    }
}
