#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
project_root="${RUNTIME_PROJECT_SOURCE:-$script_dir}"
cd "$project_root"

runtime_port="${PORT:-}"
if [[ ! "$runtime_port" =~ ^[0-9]+$ ]] || (( runtime_port < 1024 || runtime_port > 65535 )); then
  echo "ERROR: PORT must be an explicitly assigned numeric port between 1024 and 65535." >&2
  exit 1
fi
if lsof -tiTCP:"$runtime_port" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "ERROR: assigned port $runtime_port is already occupied." >&2
  exit 1
fi

required=(DATABASE_URL NEXTAUTH_URL NEXTAUTH_SECRET)
for name in "${required[@]}"; do
  if [[ -z "${!name:-}" ]]; then
    echo "ERROR: ${name} must be set." >&2
    exit 1
  fi
done

if [[ "${NODE_ENV:-production}" == "production" ]]; then
  if [[ ${#NEXTAUTH_SECRET} -lt 32 ]]; then
    echo "ERROR: NEXTAUTH_SECRET must contain at least 32 characters." >&2
    exit 1
  fi
  if [[ "${NEXTAUTH_URL}" != https://* && "${ALLOW_INSECURE_HTTP:-0}" != "1" ]]; then
    echo "ERROR: NEXTAUTH_URL must use HTTPS in production." >&2
    exit 1
  fi
fi

if [[ ! -d node_modules ]]; then
  echo "ERROR: dependencies are not installed; run npm ci during the build phase." >&2
  exit 1
fi

if [[ "${NODE_ENV:-production}" == "production" ]]; then
  if [[ ! -d .next ]]; then
    echo "ERROR: production build is missing; run npm run build before startup." >&2
    exit 1
  fi
  exec npm run start -- --hostname 127.0.0.1 --port "$runtime_port"
fi

exec npm run dev -- --hostname 127.0.0.1 --port "$runtime_port"
