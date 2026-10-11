# HTTPS and phones

On your home network, `http://<server>:3000` works in any browser. To **install FamilyOS on phones** and use **Share → FamilyOS**, browsers require HTTPS. Pick one of the options below, then set `FAMOS_BASE_URL` to the address people will use and restart (`docker compose up -d`). FamilyOS checks where requests come from against this address, so use it everywhere. If people also reach FamilyOS by another address (for example the server's IP address at home), list it in `FAMOS_TRUSTED_ORIGINS`, separated by commas.

## Option A: Tailscale (no open ports)

Install Tailscale on the server and on the family's phones, then on the server:

```bash
tailscale serve --bg 3000
```

Tailscale prints an address such as `https://homeserver.tail1234.ts.net`. Use it as `FAMOS_BASE_URL`. Only devices in your tailnet can reach it.

## Option B: Caddy with your own domain

Point a domain (for example `family.example.com`) at your server, open ports 80 and 443, and add Caddy to `docker-compose.yml`:

```yaml
services:
  famos:
    # ...as before, plus:
    environment:
      FAMOS_BASE_URL: https://family.example.com
      # Caddy connects from the compose network; believe its X-Forwarded-For header.
      FAMOS_TRUSTED_PROXIES: 172.16.0.0/12

  caddy:
    image: caddy:2
    ports: ["80:80", "443:443"]
    command: caddy reverse-proxy --from family.example.com --to famos:3000
    volumes: [caddy-data:/data]
    restart: unless-stopped

volumes:
  caddy-data:
```

Caddy gets and renews the certificate by itself.

## Why `FAMOS_TRUSTED_PROXIES` matters

Sign-in attempts are limited per address. Behind a proxy, every request seems to come from the proxy, so FamilyOS needs to know which proxy it may believe about the real address. List only your proxy (an IP address or a range, separated by commas). Without it, FamilyOS ignores `X-Forwarded-For` entirely, so nobody can fake their address.

## On the phones

Open the address, sign in, then use the browser's **Add to Home Screen** (Safari: Share → Add to Home Screen; Chrome: ⋮ → Install app). After that, FamilyOS appears in the share sheet of browsers that support it (Chrome on Android does). Shared items open a short preview; tap **Add to Quick add** to send them. Where it does not appear, paste or attach the item under **Add to Quick add** on Quick add page.

For a shared tablet in the kitchen, see [Family members, roles and devices](members.md): an admin marks it once under **Settings → Family → Devices**, and from then on the family picks their profile there and enters their PIN.
