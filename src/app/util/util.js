import { Client } from 'ssh2';

/**
 * Execute a command on a remote host via SSH.
 * @param {Object} options
 * @param {string} options.host
 * @param {number} [options.port=22]
 * @param {string} options.username
 * @param {string} options.privateKey
 * @param {string} [options.publicKey]
 * @param {string} options.command
 * @param {string} [options.sudoPassword]
 */
export function executeSSHCommand({ host, port = 22, username, privateKey, publicKey, command, sudoPassword = '' }) {
    return new Promise((resolve, reject) => {
        const conn = new Client();

        conn.on('ready', () => {
            const sudoCommand = sudoPassword ? `echo '${sudoPassword}' | sudo -S ${command}` : command;
            conn.exec(sudoCommand, (err, stream) => {
                if (err) {
                    reject(new Error(`Error executing command: ${err.message}`));
                    return;
                }

                let output = '';
                let errorOutput = '';

                stream.on('data', (data) => {
                    output += data.toString();
                });

                stream.stderr.on('data', (data) => {
                    errorOutput += data.toString();
                });

                stream.on('close', (code) => {
                    if (code === 0) {
                        resolve(output);
                    } else {
                        reject(
                            new Error(
                                `Command failed with exit code ${code}: ${errorOutput || 'No error message available'}`
                            )
                        );
                    }
                    conn.end();
                });
            });
        })
            .on('error', (err) => {
                reject(new Error(`SSH connection failed: ${err.message}`));
            })
            .connect({
                host,
                port,
                username,
                privateKey,
                publicKey,
            });
    });
}

export function buildDockerExecCommand(containerName, command) {
    return `/usr/local/bin/docker exec ${containerName} ${command}`;
}
