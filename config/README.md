# Host setup for WireGuard on k3s

Each WireGuard instance is generated as `config/instances/wg-<id>.yaml`
(Secret + Deployment + LoadBalancer Service) from the Postgres DB and applied
to a k3s cluster via `kubectl`.

## Prerequisites

- k3s cluster (single node is fine)
- `kubectl` with a kubeconfig for the cluster
- MetalLB (installed below) so `LoadBalancer` Services get external IPs

## 1. Create the namespace

```bash
kubectl apply -f config/namespace.yaml
```

All WireGuard resources live in the `wireguard` namespace (override with the
`K8S_NAMESPACE` env var when generating manifests).

## 2. Enable IPv4 forwarding

WireGuard routes client traffic through the node, so the node must forward:

```bash
sudo sysctl -w net.ipv4.ip_forward=1
echo 'net.ipv4.ip_forward=1' | sudo tee /etc/sysctl.d/99-wireguard.conf
```

## 3. Install MetalLB

```bash
kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.14.9/config/manifests/metallb-native.yaml
kubectl apply -f config/metallb.yaml
```

Edit `config/metallb.yaml` first: `addresses` must be a free block inside your
LAN subnet and outside your DHCP range.

## 4. Disable k3s built-in service LB

k3s ships `servicelb`, which also tries to satisfy `LoadBalancer` Services and
races MetalLB. Disable it in `/etc/rancher/k3s/config.yaml`:

```yaml
disable:
  - servicelb
```

then `sudo systemctl restart k3s`.

## 5. Verify

```bash
kubectl get svc -n wireguard -o wide
```

Each `wg-<id>` Service should show an `EXTERNAL-IP` from the MetalLB pool
instead of `<pending>`.

## 6. Router + DNS

Each instance Service gets its own VIP, all on UDP `server_listen_port`.

- LAN clients: `wg-<id>.example.com` -> the VIP (split-horizon DNS).
- Internet clients: `wg-<id>.example.com` -> the public IP; the router
  forwards `public:server_listen_port` -> `VIP:server_listen_port`.
