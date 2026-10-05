import fs from 'fs';
import path from 'path';
import { isValidIpv4 } from '../../util/ip';
import type { LbMode } from '../../types';

export const TEMPLATES_DIR = path.join(process.cwd(), 'src', 'app', 'api', 'lib', 'templates');

export type TemplateData = Record<string, unknown>;

function readTemplate(...parts: string[]): string {
    return fs.readFileSync(path.join(TEMPLATES_DIR, ...parts), 'utf8');
}

const TEMPLATES = {
    secret: readTemplate('k8s', 'secret.yaml.tpl'),
    deployment: readTemplate('k8s', 'deployment.yaml.tpl'),
    'service-dedicated': readTemplate('k8s', 'service-dedicated.yaml.tpl'),
    'service-shared': readTemplate('k8s', 'service-shared.yaml.tpl'),
    'server-conf': readTemplate('wg', 'server.conf.tpl'),
    'client-conf': readTemplate('wg', 'client.conf.tpl'),
    'peer-conf': readTemplate('wg', 'peer.conf.tpl'),
};

const VARIABLE_RE = /\{\{\s*([\w.]+)\s*\}\}/g;

function renderTemplate(template: string, data: TemplateData): string {
    const stack: boolean[] = [];
    const output: string[] = [];

    for (const line of template.split('\n')) {
        const ifMatch = /^\{%\s*if\s+([\w.]+)\s*%\}$/.exec(line);
        if (ifMatch) {
            stack.push(Boolean(data[ifMatch[1]]));
            continue;
        }

        if (/^\{%\s*endif\s*%\}$/.test(line)) {
            stack.pop();
            continue;
        }

        if (stack.some((active) => !active)) {
            continue;
        }

        output.push(line);
    }

    return output.join('\n').replace(VARIABLE_RE, (match, key) => (data[key] != null ? String(data[key]) : ''));
}

const secretTemplate = (data: TemplateData): string => renderTemplate(TEMPLATES.secret, data);
const deploymentTemplate = (data: TemplateData): string => renderTemplate(TEMPLATES.deployment, data);
const SHARED_LB_IP_ENV = 'SHARED_LOAD_BALANCER_IP';

const dedicatedServiceTemplate = (data: TemplateData): string => renderTemplate(TEMPLATES['service-dedicated'], data);

const sharedServiceTemplate = (data: TemplateData): string => {
    const sharedIp = process.env[SHARED_LB_IP_ENV] || '';
    if (!sharedIp) {
        throw new Error(`${SHARED_LB_IP_ENV} is not set`);
    }
    return renderTemplate(TEMPLATES['service-shared'], { ...data, load_balancer_ip: sharedIp });
};

const SERVICE_TEMPLATES: Record<LbMode, (data: TemplateData) => string> = {
    dedicated: dedicatedServiceTemplate,
    shared: sharedServiceTemplate,
};

// The shared IP is a single global value: when it is a valid IPv4 address every
// instance Service pins it and MetalLB merges their distinct UDP ports onto it.
export function sharedLoadBalancerIp(): string | null {
    const sharedIp = process.env[SHARED_LB_IP_ENV];
    return sharedIp && isValidIpv4(sharedIp) ? sharedIp : null;
}

export function lbMode(): LbMode {
    return sharedLoadBalancerIp() ? 'shared' : 'dedicated';
}

// `externalTrafficPolicy` is fixed per mode in the Service templates:
// dedicated uses `Local` (own IP per instance, so the real client source IP is
// preserved) and shared uses `Cluster` (MetalLB only allows `Local` on a shared
// IP when every Service on it selects the exact same pods, which the
// per-instance `app: wg-<id>` selectors never do).
export function serviceTemplateFactory(): (data: TemplateData) => string {
    return SERVICE_TEMPLATES[lbMode()];
}

const serverConfigTemplate = (data: TemplateData): string => renderTemplate(TEMPLATES['server-conf'], data);
const clientConfigTemplate = (data: TemplateData): string => renderTemplate(TEMPLATES['client-conf'], data);
const peerConfigTemplate = (data: TemplateData): string => renderTemplate(TEMPLATES['peer-conf'], data);

export { secretTemplate, deploymentTemplate, serverConfigTemplate, clientConfigTemplate, peerConfigTemplate };
