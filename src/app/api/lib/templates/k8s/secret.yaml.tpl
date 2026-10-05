apiVersion: v1
kind: Secret
metadata:
  namespace: {{ namespace }}
  name: {{ name }}-conf
type: Opaque
data:
  wg0.conf: {{ server_config_base64 }}
