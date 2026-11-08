#!/usr/bin/env bash
set -e

# Se 'node' não estiver no PATH padrão, procurar em locais comuns (como nvm)
if ! command -v node >/dev/null 2>&1; then
  for candidate in "$HOME/.nvm/versions/node/"*"/bin" /usr/local/bin /usr/bin; do
    if [ -x "$candidate/node" ]; then
      export PATH="$candidate:$PATH"
      break
    fi
  done
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec node "$SCRIPT_DIR/finish.js" "$@"
