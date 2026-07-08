# OHC-Cluster

OpenHamClock's own DX cluster node. Aggregates spots from sources that are
_designed_ for automated consumption, plus spots submitted by actual humans,
and serves them over both a classic telnet cluster interface and HTTP.

No DXSpider/AR-Cluster nodes are scraped. That's the point.

## Spot sources

| Source    | What                  | How                                                       |
| --------- | --------------------- | --------------------------------------------------------- |
| RBN       | CW/RTTY skimmer spots | telnet.reversebeacon.net:7000 (open feed, built for this) |
| RBN       | FT8/FT4 skimmer spots | telnet.reversebeacon.net:7001                             |
| HamQTH    | Human cluster spots   | public CSV feed, polled once per minute                   |
| OHC users | Human spots           | telnet `dx` command or `POST /api/dxcluster/spot`         |

RBN volume is collapsed by call+band+mode into living aggregates (skimmer
count, best SNR) so 40 skimmers hearing the same CQ produce one spot.

## Interfaces

**Telnet (port 7300)** — classic cluster dialect: callsign login (validated,
junk rejected), `DX de` streaming, `sh/dx [n]`, `sh/dx/human [n]`, `set/dx`,
`unset/dx`, `dx <freq-khz> <call> [comment]`, `help`, `bye`.

**HTTP (port 3002)** — `GET /health`, `GET /api/stats`,
`GET /api/dxcluster/spots?limit=50&band=20m&mode=CW&humanOnly=1`
(dxspider-proxy-compatible shape), `POST /api/dxcluster/spot`.

## Abuse posture

Per-IP connection caps (5), global cap (200), 3 login attempts, login/idle
timeouts, line-length caps, flood disconnects, and rate-limited submissions
(5/min telnet, 10/min HTTP). We have been on the receiving end of "your
client is hammering my node" — this node is built so its sysop never has to
send that email.

## Deploying on Railway

1. New service from this directory (`ohc-cluster/`).
2. Set `CALLSIGN` (RBN login) and `NODE_CALL` (what telnet users see).
3. HTTP listens on 3002 by default (set `HTTP_PORT` to change it). Note:
   once a TCP proxy is attached, Railway sets `PORT` to the proxy's target
   port; the server detects that and keeps the HTTP API on 3002.
4. Telnet needs a **TCP Proxy**: Settings → Networking → TCP Proxy →
   internal port 7300. Railway assigns the public `host:port` — publish that.

## Environment

| Var              | Default | Purpose                                                             |
| ---------------- | ------- | ------------------------------------------------------------------- |
| `HTTP_PORT`      | 3002    | HTTP API port (falls back to `PORT` unless that is the telnet port) |
| `TELNET_PORT`    | 7300    | telnet cluster port                                                 |
| `CALLSIGN`       | K0CJH   | RBN login callsign (must be valid)                                  |
| `NODE_CALL`      | K0CJH-2 | node callsign shown to telnet users                                 |
| `RBN_ENABLED`    | 1       | set `0` to disable RBN ingest                                       |
| `HAMQTH_ENABLED` | 1       | set `0` to disable HamQTH polling                                   |
| `LOG_LEVEL`      | info    | `debug` / `info` / `warn`                                           |

## Tests

```
npm test   # node --test, no extra deps
```
