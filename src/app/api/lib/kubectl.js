import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const bin = process.env.KUBECTL_BIN || 'kubectl';

export async function runKubectl(args) {
    const { stdout, stderr } = await execFileAsync(bin, args, {
        maxBuffer: 10 * 1024 * 1024,
    });
    return { stdout, stderr };
}
