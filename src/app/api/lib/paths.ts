import path from 'path';

export function configDir(): string {
    return process.env.K8S_CONFIG_DIR || path.join(process.cwd(), 'config');
}

export function instanceManifestFile(instance: { id: number }): string {
    return path.join(configDir(), 'instances', `wg-${instance.id}.yaml`);
}

export function namespace(): string {
    return process.env.K8S_NAMESPACE || 'wireguard';
}
