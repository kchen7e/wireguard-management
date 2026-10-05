apiVersion: v1
kind: Service
metadata:
  namespace: {{ namespace }}
  name: {{ name }}
{% if load_balancer_ip %}
  annotations:
    metallb.io/loadBalancerIPs: {{ load_balancer_ip }}
    metallb.io/allow-shared-ip: {{ load_balancer_ip }}
{% endif %}
spec:
  type: LoadBalancer
  # MetalLB forbids `Local` on a shared IP across differing pod selectors, so
  # sharing inherently masquerades the client source IP (SNAT).
  externalTrafficPolicy: Cluster
  allocateLoadBalancerNodePorts: false
  selector:
    app: {{ name }}
  ports:
    - name: wireguard
      protocol: UDP
      port: {{ server_listen_port }}
      targetPort: {{ server_listen_port }}
