apiVersion: apps/v1
kind: Deployment
metadata:
  namespace: {{ namespace }}
  name: {{ name }}
spec:
  replicas: 1
  selector:
    matchLabels:
      app: {{ name }}
  template:
    metadata:
      labels:
        app: {{ name }}
    spec:
      containers:
        - name: wireguard
          image: {{ image }}
          command:
            - /bin/bash
            - -c
          args:
            - |
              for backend in nft legacy; do
                if iptables-$backend -t nat -L -n >/dev/null 2>&1; then
                  printf '#!/bin/sh\nexec /sbin/iptables-%s "$@"\n' "$backend" > /usr/local/bin/iptables
                  chmod +x /usr/local/bin/iptables
                  break
                fi
              done
              bash /usr/bin/wg-quick up /etc/wireguard/wg0.conf && exec sleep infinity
          securityContext:
            privileged: true
          volumeMounts:
            - name: config
              mountPath: /etc/wireguard
              readOnly: true
            - name: tun
              mountPath: /dev/net/tun
      volumes:
        - name: config
          secret:
            secretName: {{ name }}-conf
        - name: tun
          hostPath:
            path: /dev/net/tun
            type: CharDevice
