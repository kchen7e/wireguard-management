# WireGuard Management

Web UI (Next.js) for managing WireGuard instances on a k3s cluster. Instances
are stored in Postgres and rendered as Kubernetes manifests
(Secret + Deployment + LoadBalancer Service) that are applied to the cluster
with `kubectl`.

## Requirements

- Node.js 20+ and pnpm
- PostgreSQL (connection string via `DATABASE_URL`)
- A k3s cluster and `kubectl` with a valid kubeconfig (see
  [Host setup for WireGuard on k3s](#host-setup-for-wireguard-on-k3s))

## Deployment topology

Run a single cluster. The project targets a **single-node** k3s install, or a
multi-node cluster in which the instance pods are pinned to one node
(`nodeSelector` / node affinity).

MetalLB is not a proxy and is not in the packet path: it allocates a
load-balancer IP to each `LoadBalancer` Service and makes the network deliver
that IP to a node. In layer-2 mode exactly one node answers ARP/NDP for the IP,
so every port of that IP arrives at that one node, and `kube-proxy` on that node
spreads connections across the pods behind the Service.

`externalTrafficPolicy` is fixed per mode in the Service templates, because the
right value follows from the mode rather than from configuration:

| Mode        | Policy    | Load-balancer IP                | Client source IP        |
| ----------- | --------- | ------------------------------- | ----------------------- |
| `dedicated` | `Local`   | one per instance                | real peer IP            |
| `shared`    | `Cluster` | one shared, a port per instance | masqueraded to the node |

`dedicated` can use `Local` because each instance has its own IP: MetalLB
announces it from the node running that instance's pod, so there is no cross-node
hop and no SNAT, and WireGuard sees the real peer address.

`shared` must use `Cluster`. MetalLB only permits `Local` on a shared IP when
every Service on it selects the _exact same pods_: in layer-2 mode one node
answers ARP/NDP for the IP, so every port of it arrives at that one node, and
`Local` forbids forwarding to pods on other nodes. Identical selectors are what
guarantee the same eligible nodes back every port. This project gives each
instance its own Deployment and a distinct `app: wg-<id>` selector, so a second
instance on a shared IP could not be allocated the IP.

## Configuration

| Variable                  | Required | Default                                 | Description                                                                 |
| ------------------------- | -------- | --------------------------------------- | --------------------------------------------------------------------------- |
| `DATABASE_URL`            | yes      | —                                       | Postgres connection string                                                  |
| `K8S_NAMESPACE`           | no       | `wireguard`                             | Kubernetes namespace                                                        |
| `K8S_CONFIG_DIR`          | no       | `./config`                              | Directory where generated manifests are written                             |
| `SHARED_LOAD_BALANCER_IP` | no       | —                                       | Enables shared load-balancer mode when set to a valid IPv4                  |
| `WG_IMAGE`                | no       | `docker.storm7e.de/wireguard-go:latest` | WireGuard container image                                                   |
| `WG_PORT_BASE`            | no       | `51820`                                 | First port the per-instance listen-port allocator considers                 |
| `KUBECTL_BIN`             | no       | `kubectl`                               | kubectl binary to invoke                                                    |
| `KUBECONFIG`              | no       | `~/.kube/config`                        | kubeconfig path (set to `/etc/wireguard/kubeconfig` in the container image) |
| `SMTP_HOST`               | no       | —                                       | SMTP server host for "Send by server" emails                                |
| `SMTP_PORT`               | no       | `587`                                   | SMTP port                                                                   |
| `SMTP_SECURE`             | no       | `false`                                 | `true` for implicit TLS (465); `false` upgrades with STARTTLS (587)         |
| `SMTP_USER`               | no       | —                                       | SMTP username (omit for an unauthenticated relay)                           |
| `SMTP_PASS`               | no       | —                                       | SMTP password                                                               |
| `EMAIL_FROM`              | no       | —                                       | From address used for outgoing emails                                       |

## Local development

```bash
pnpm install
# create .env with DATABASE_URL=... (see Configuration)
pnpm dev
```

Open http://localhost:3000.

## Build & deploy (Docker)

The image bundles the app and `kubectl`; it reads the kubeconfig from
`/etc/wireguard/kubeconfig`.

```bash
podman build --platform linux/amd64 -f devops/Dockerfile -t docker.storm7e.de/wireguard-management .
podman push docker.storm7e.de/wireguard-management:latest
```

Run the build from the repo root — the build context must be the repo root
(`COPY package.json …` and `COPY src/…` resolve against it). Do **not** `cd
devops` first, or the context becomes `devops/` and the build fails/comes out
empty.

On the host:

```bash
docker compose -f devops/docker-compose.yaml pull
docker compose -f devops/docker-compose.yaml up -d
```

`devops/docker-compose.yaml`:

- runs rootless as `${APP_UID:-1044}:${APP_GID:-100}` (set both in `.env` to
  match the host user that owns the bind mounts)
- bundles `config/metallb.yaml` into the image (the MetalLB pool the server
  reads to auto-assign IPs)
- mounts `./config/instances` -> `/app/config/instances`, so the generated
  `wg-<id>.yaml` manifests are written back to the host
- mounts `${KUBECONFIG_PATH:-./kubeconfig}` -> `/etc/wireguard/kubeconfig:ro`
- reads `.env` for `DATABASE_URL` and other variables
- exposes port 3000

## Host setup for WireGuard on k3s

Each WireGuard instance is generated as `config/instances/wg-<id>.yaml`
(Secret + Deployment + LoadBalancer Service) from the Postgres DB and applied
to a k3s cluster via `kubectl`.

### Prerequisites

- k3s cluster (single node is fine)
- `kubectl` with a kubeconfig for the cluster
- MetalLB (installed below) so `LoadBalancer` Services get external IPs

### 1. Create the namespace

```bash
kubectl create namespace wireguard
```

All WireGuard resources live in the `wireguard` namespace (override with the
`K8S_NAMESPACE` env var when generating manifests).

### 2. Enable IPv4 forwarding

WireGuard routes client traffic through the node, so the node must forward:

```bash
sudo sysctl -w net.ipv4.ip_forward=1
echo 'net.ipv4.ip_forward=1' | sudo tee /etc/sysctl.d/99-wireguard.conf
```

### 3. Install MetalLB

```bash
kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.14.9/config/manifests/metallb-native.yaml
kubectl apply -f config/metallb.yaml
```

Edit `config/metallb.yaml` first: `addresses` must be a free block inside your
LAN subnet and outside your DHCP range. The same file is bundled into the app
image, where the server reads it to auto-assign each instance's load-balancer
IP — keep the two in sync.

Because the file is baked in, changing the pool normally requires rebuilding the
image. To override it without a rebuild, mount your own copy read-only:

```yaml
volumes:
    - ../config/metallb.yaml:/app/config/metallb.yaml:ro
```

### 4. Disable k3s built-in service LB

k3s ships `servicelb`, which also tries to satisfy `LoadBalancer` Services and
races MetalLB. Disable it in `/etc/rancher/k3s/config.yaml`:

```yaml
disable:
    - servicelb
```

then `sudo systemctl restart k3s`.

### 5. Verify

```bash
kubectl get svc -n wireguard -o wide
```

Each `wg-<id>` Service should show an `EXTERNAL-IP` from the MetalLB pool
instead of `<pending>`.

### 6. Load balancer mode (dedicated vs shared IP)

Manifests are rendered from Jinja2-style templates in
`src/app/api/lib/templates/k8s/*.tpl` (`{{ var }}` and `{% if %}` blocks). The
Service template is chosen by `lbMode()` / `serviceTemplateFactory()` in
`src/app/api/lib/templates.ts`: shared mode is enabled implicitly when
`SHARED_LOAD_BALANCER_IP` is set to a valid IPv4 address.

- `dedicated` (default): each instance gets its own MetalLB IP.
- `shared`: all instances share one IP (from `SHARED_LOAD_BALANCER_IP`) and are
  distinguished by UDP port.

To switch, set `SHARED_LOAD_BALANCER_IP=<ip>` in the environment (e.g. `.env`)
and reconcile; remove it to return to dedicated mode.

#### dedicated (default)

Each Service pins its own IP, and `load_balancer_ip` must be unique across
instances:

```yaml
metadata:
    annotations:
        metallb.io/loadBalancerIPs: <instance.load_balancer_ip>
```

#### shared

The shared IP is a single global value from `SHARED_LOAD_BALANCER_IP`; the
per-instance `load_balancer_ip` field is ignored. Every Service pins that IP and
adds the MetalLB shared-IP annotation, so MetalLB merges their distinct UDP
ports onto it. The sharing key equals the shared IP, and `server_listen_port`
must be unique across instances:

```yaml
metadata:
    annotations:
        metallb.io/loadBalancerIPs: <shared IP>
        metallb.io/allow-shared-ip: <shared IP>
```

If `SHARED_LOAD_BALANCER_IP` is unset or not a valid IPv4 address, dedicated
mode is used.

Notes:

- `externalTrafficPolicy` is fixed per mode: dedicated renders `Local`, which
  preserves the real client source IP; shared renders `Cluster`, which SNATs the
  client source address to the node's internal IP (e.g. a `10.244.x.x`
  Flannel/cni0 address) so WireGuard reports that masqueraded address as the peer
  endpoint.
- MetalLB only permits `Local` on a shared IP when every Service on that IP has
  an _identical_ pod selector - it compares the selectors as a "backend key" and
  refuses the allocation when they differ, leaving the Service without an
  external IP. Each instance here is its own Deployment with a distinct
  `app: wg-<id>` selector, so with more than one instance on a shared IP the
  second Service stays `<pending>`; a single instance on the shared IP is fine.
  Use one dedicated IP per instance if you need real client IPs across several
  instances. See [Deployment topology](#deployment-topology).
- In both modes the client endpoint is `<server_endpoint>:<server_listen_port>`,
  so the port is what distinguishes instances at the edge.
- Each instance is assigned the first free port at or above `WG_PORT_BASE`
  (default `51820`), so router port-forwarding rules never collide. The next port
  is previewed in the create dialog and shown as `Host Port` on the instance
  card.

### 7. Router + DNS

- Dedicated mode: each instance Service gets its own load-balancer IP (its
  "VIP", the `EXTERNAL-IP` shown by `kubectl get svc`).
- Shared mode: all instances share one load-balancer IP; the port separates them.

- LAN clients: `wg-<id>.example.com` -> the VIP (split-horizon DNS).
- Internet clients: `wg-<id>.example.com` -> the public IP; the router
  forwards `public:server_listen_port` -> `VIP:server_listen_port`.
