[Interface]
Address = {{ address }}
ListenPort = {{ listen_port }}
PrivateKey = {{ private_key }}
{% if dns %}
DNS = {{ dns }}
{% endif %}
{% if subnet %}
PostUp = iptables -t nat -A POSTROUTING -s {{ subnet }} -o eth0 -j MASQUERADE
PostDown = iptables -t nat -D POSTROUTING -s {{ subnet }} -o eth0 -j MASQUERADE
{% endif %}
{{ peers }}
