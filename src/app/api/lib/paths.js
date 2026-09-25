import path from 'path';

export function configDir() {
    return process.env.K8S_CONFIG_DIR || path.join(process.cwd(), 'config');
}

export function instanceManifestFile(instance) {
    return path.join(configDir(), 'instances', `wg-${instance.id}.yaml`);
}
