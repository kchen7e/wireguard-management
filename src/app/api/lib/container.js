import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const runtime = process.env.CONTAINER_RUNTIME || 'podman';

export async function runContainer(args) {
    const { stdout, stderr } = await execFileAsync(runtime, args, {
        maxBuffer: 10 * 1024 * 1024,
    });
    return { stdout, stderr };
}
