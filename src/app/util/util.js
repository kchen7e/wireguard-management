import { Client } from 'ssh2';

export const executeSSHCommand = (host, username, privateKey, pubKey, command, port = 22, sudoPassword = '') => {
    return new Promise((resolve, reject) => {
        const conn = new Client();

        conn.on('ready', () => {
            console.log('SSH Connection established.');
            const sudoCommand = sudoPassword ? `echo '${sudoPassword}' | sudo -S ${command}` : command;
            // const fullCommand = `bash -l -c "${command}"`;
            conn.exec(sudoCommand, (err, stream) => {
                if (err) {
                    reject(`Error executing command: ${err}`);
                }

                let output = '';
                let errorOutput = ''; // To capture standard error

                stream.on('data', (data) => {
                    output += data.toString();
                });

                stream.stderr.on('data', (data) => {
                    errorOutput += data.toString(); // Capture stderr
                });

                stream.on('close', (code, signal) => {
                    if (code === 0) {
                        resolve(output);
                    } else {
                        reject(`Command failed with exit code ${code}: ${errorOutput || 'No error message available'}`);
                    }
                    conn.end();
                });
            });
        })
            .on('error', (err) => {
                reject(`SSH connection failed: ${err}`);
            })
            .connect({
                host,
                username,
                privateKey,
                publicKey: pubKey,
                port,
            });
    });
};
