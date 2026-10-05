import { execFile } from 'child_process';
import { promisify } from 'util';
import { logger } from './logger';

const execFileAsync = promisify(execFile);

const bin = process.env.KUBECTL_BIN || 'kubectl';

export async function runKubectl(args: string[]): Promise<{ stdout: string; stderr: string }> {
    logger.debug('kubectl', { args });
    try {
        const { stdout, stderr } = await execFileAsync(bin, args, {
            maxBuffer: 10 * 1024 * 1024,
        });
        if (stderr) logger.debug('kubectl wrote to stderr', { args, stderr });
        return { stdout, stderr };
    } catch (error) {
        logger.debug('kubectl failed', { args, error });
        throw error;
    }
}
