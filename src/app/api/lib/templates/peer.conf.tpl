[Peer]
{% if description %}
# {{ description }}
{% endif %}
PublicKey = {{ public_key }}
{% if psk %}
PresharedKey = {{ psk }}
{% endif %}
AllowedIPs = {{ allowed_ips }}
{% if endpoint %}
Endpoint = {{ endpoint }}
{% endif %}
{% if keepalive %}
PersistentKeepalive = {{ keepalive }}
{% endif %}
