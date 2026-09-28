[Interface]
PrivateKey = {{ private_key }}
Address = {{ address }}
{% if dns %}
DNS = {{ dns }}
{% endif %}
{{ peers }}
