#!/usr/bin/env bash
#
# Gate de calidad ejecutado por el script `prereleasy` del manifest.json
# (`vtex release` lo corre antes de generar el tag).
#
# Pasos:
#   1. eslint sobre todo el proyecto (incluye prettier vía eslint-config-vtex)
#   2. tsc --noEmit sobre el servicio node/
#   3. jest sobre el servicio node/
#
# Uso manual:
#   bash lint.sh          # gate completo
#   bash lint.sh --fix    # aplica los fixes automáticos de eslint y sigue

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

ESLINT_ARGS=()
if [ "${1:-}" = "--fix" ]; then
  ESLINT_ARGS+=(--fix)
fi

# Elige el package manager según el lockfile presente.
if [ -f yarn.lock ] && command -v yarn >/dev/null 2>&1; then
  PKG_INSTALL="yarn install --frozen-lockfile"
else
  PKG_INSTALL="npm ci"
fi

step() {
  printf '\n\033[1;34m==> %s\033[0m\n' "$1"
}

ensure_deps() {
  local dir="$1"

  if [ ! -d "$dir/node_modules" ]; then
    step "Instalando dependencias en ${dir}"
    (cd "$dir" && eval "$PKG_INSTALL")
  fi
}

ensure_deps "."
ensure_deps "node"

step "ESLint"
./node_modules/.bin/eslint --ext js,jsx,ts,tsx . ${ESLINT_ARGS[@]+"${ESLINT_ARGS[@]}"}

step "TypeScript (node/)"
(cd node && ./node_modules/.bin/tsc --noEmit -p tsconfig.json)

step "Tests (node/)"
(cd node && ./node_modules/.bin/jest --passWithNoTests)

printf '\n\033[1;32m✔ lint.sh: todo OK\033[0m\n'
