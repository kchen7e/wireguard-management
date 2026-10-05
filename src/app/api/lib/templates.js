import fs from 'fs';
import path from 'path';
import { isValidIpv4 } from '../../util/ip.js';

const TEMPLATES_DIR = path.join(process.cwd(), 'src', 'app', 'api', 'lib', 'templates');

function readTemplate(name) {
    return fs.readFileSync(path.join(TEMPLATES_DIR, name), 'utf8');
}

const TEMPLATES = {
    secret: readTemplate('secret.yaml.tpl'),
    deployment: readTemplate('deployment.yaml.tpl'),
    'service-dedicated': readTemplate('service-dedicated.yaml.tpl'),
    'service-shared': readTemplate('service-shared.yaml.tpl'),
    'server-conf': readTemplate('server.conf.tpl'),
    'client-conf': readTemplate('client.conf.tpl'),
    'peer-conf': readTemplate('peer.conf.tpl'),
};

const VARIABLE_RE = /\{\{\s*([\w.]+)\s*\}\}/g;

function renderTemplate(template, data) {
    const stack = [];
    const output = [];

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

const secretTemplate = (data) => renderTemplate(TEMPLATES.secret, data);
const deploymentTemplate = (data) => renderTemplate(TEMPLATES.deployment, data);
const SHARED_LB_IP_ENV = 'SHARED_LOAD_BALANCER_IP';

const dedicatedServiceTemplate = (data) => renderTemplate(TEMPLATES['service-dedicated'], data);

const sharedServiceTemplate = (data) => {
    const sharedIp = process.env[SHARED_LB_IP_ENV] || '';
    if (!sharedIp) {
        throw new Error(`${SHARED_LB_IP_ENV} is not set`);
    }
    return renderTemplate(TEMPLATES['service-shared'], { ...data, load_balancer_ip: sharedIp });
};

const SERVICE_TEMPLATES = {
    dedicated: dedicatedServiceTemplate,
    shared: sharedServiceTemplate,
};

export function lbMode() {
    const sharedIp = process.env[SHARED_LB_IP_ENV];
    return sharedIp && isValidIpv4(sharedIp) ? 'shared' : 'dedicated';
}

// `externalTrafficPolicy` is fixed per mode in the Service templates:
// dedicated uses `Local` (own IP per instance, so the real client source IP is
// preserved) and shared uses `Cluster` (MetalLB only allows `Local` on a shared
// IP when every Service on it selects the exact same pods, which the
// per-instance `app: wg-<id>` selectors never do).
export function serviceTemplateFactory() {
    return SERVICE_TEMPLATES[lbMode()] || SERVICE_TEMPLATES.dedicated;
}

const serverConfigTemplate = (data) => renderTemplate(TEMPLATES['server-conf'], data);
const clientConfigTemplate = (data) => renderTemplate(TEMPLATES['client-conf'], data);
const peerConfigTemplate = (data) => renderTemplate(TEMPLATES['peer-conf'], data);

export { secretTemplate, deploymentTemplate, serverConfigTemplate, clientConfigTemplate, peerConfigTemplate };
