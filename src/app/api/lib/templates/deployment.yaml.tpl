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
            - bash /usr/bin/wg-quick up /etc/wireguard/wg0.conf && exec sleep infinity
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
