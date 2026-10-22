#!/usr/bin/env bash
set -euo pipefail

pi_prefix="${HOME}/.pi/npm"
pi_bin="${pi_prefix}/bin/pi"
export PATH="${pi_prefix}/bin:${PATH}"

if [[ -n "${PI_VERSION:-}" ]]; then
  mkdir -p "${pi_prefix}"
  # Multiple workshop containers can share this installation.
  exec 9>"${pi_prefix}/.install.lock"
  flock -x 9

  if [[ "$("${pi_bin}" --version 2>/dev/null || true)" != "${PI_VERSION}" ]]; then
    npm install -g --prefix "${pi_prefix}" --ignore-scripts "@earendil-works/pi-coding-agent@${PI_VERSION}"
  fi

  installed_version="$("${pi_bin}" --version)"
  if [[ "${installed_version}" != "${PI_VERSION}" ]]; then
    printf 'Pi version mismatch: requested %s, installed %s.\n' "${PI_VERSION}" "${installed_version}" >&2
    exit 1
  fi
  exec 9>&-
fi

exec "$@"
