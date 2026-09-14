import { NextResponse } from 'next/server';

import { executeSSHCommand } from '../../util/util.js';

// Check environment variables upon start
// const sshPrivate = process.env.SSH_PRIVATE;
// const sshPublic = process.env.SSH_PUBLIC;
// const sshUser = process.env.SSH_USER;
const sshPrivate = `
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
QyNTUxOQAAACC3awQBkBnXppVTFeOYczD1Mf7tng2WeR7QXuTgCQ4OWAAAAKC2nZAutp2Q
LgAAAAtzc2gtZWQyNTUxOQAAACC3awQBkBnXppVTFeOYczD1Mf7tng2WeR7QXuTgCQ4OWA
AAAED5ISAGI6YgskFXilZNw/60gOJDReuC8qhjN0BenLQczrdrBAGQGdemlVMV45hzMPUx
/u2eDZZ5HtBe5OAJDg5YAAAAF2tjaGVuQFNhZ2l0dGFyaXVzLmxvY2FsAQIDBAUG
-----END OPENSSH PRIVATE KEY-----
`;
const sshPublic = `
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAILdrBAGQGdemlVMV45hzMPUx/u2eDZZ5HtBe5OAJDg5Y kchen@wg-gui
`;
const sshUser = 'kchen_local';
const sshHost = 'dc';
const sshPort = '60058';
const sudoPassword = '$MAN@OMEGA!7e';

// Check for missing environment variables
if (!sshPrivate || !sshPublic || !sshUser || !sshHost) {
    throw new Error('Missing required environment variables: SSH_PRIVATE, SSH_PUBLIC, SSH_USER, SSH_HOST');
}

export async function GET(request) {
    // const allowedOrigin = 'https://your-frontend-domain.com'; // replace with your frontend domain
    // const origin = request.headers.get('Origin');

    // if (origin !== allowedOrigin) {
    //     return new Response('Forbidden', { status: 403 });
    // }
    const data = await getWgData();

    return NextResponse.json({ data: data });
}

async function getWgData() {
    const sshCommand = '/usr/local/bin/docker exec wireguard wg | grep -E \"peer|latest handshake|transfer\"';
    // const sshCommand = '/usr/local/bin/docker';
    return executeSSHCommand(sshHost, sshUser, sshPrivate, sshPublic, sshCommand, sshPort, sudoPassword)
        .then((output) => {
            const result = {};
            const colourRegex = /\x1b\[[0-9;]*m/g;
            const trimmedOutput = output.replace(colourRegex, '');
            const regex = /^peer: ([^\n]+)(?:\n(\s+latest handshake: [^\n]+)\n(\s+transfer: [^\n]+))?/gm;
            let match;
            while ((match = regex.exec(trimmedOutput)) !== null) {
                result[match[1]] = result[match[1]] || {};
                if (match[2]) {
                    result[match[1]]['last_seen'] = match[2].replace('latest handshake:', '').trim();
                }
                if (match[3]) {
                    result[match[1]]['traffic_counter'] = match[3].replace('transfer:', '').trim();
                }
            }
            return result;
        })
        .catch((error) => {
            console.error(error);
        });
}
