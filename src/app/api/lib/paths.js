import path from 'path';

export function composeDir() {
    return process.env.COMPOSE_DIR || path.join(process.cwd(), 'data');
}

export function instanceConfigFile(instance) {
    return path.join(composeDir(), 'instances', `${instance.id}.conf`);
}

export function instanceComposeFile(instance) {
    return path.join(composeDir(), 'instances', `${instance.id}.yaml`);
}

export function topLevelComposeFile() {
    return path.join(process.cwd(), 'docker-compose.yaml');
}
