#!/usr/bin/env bash
# Aviso antes de un `git push` lanzado por Claude Code.
#
# Comprueba que la semilla no lleve datos de una persona real (CLAUDE.md
# §Origen y §14). En un repo privado no pasa nada; en uno público quedarían
# indexados el teléfono, el email y la foto.
#
# No es un cartel fijo: pregunta al detector compartido, así que en cuanto la
# semilla pase a datos ficticios el aviso deja de saltar solo.
set -uo pipefail

cmd=$(jq -r '.tool_input.command // ""')

# Solo el push. El patrón cubre también formas compuestas (`cd x && git push`).
case "$cmd" in
*'git push'*) ;;
*) exit 0 ;;
esac

root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
hallazgos=$("$root/scripts/datos-personales.sh")

# Repo limpio: sin aviso.
[ -z "$hallazgos" ] && exit 0

remoto=$(git -C "$root" remote get-url origin 2>/dev/null || echo 'sin remoto configurado')

jq -n \
  --arg lista "$(printf '%s\n' "$hallazgos" | sed 's/^/  • /')" \
  --arg remoto "$remoto" \
  '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "ask",
      permissionDecisionReason: (
        "ALTO: este repo contiene datos personales reales.\n\n" + $lista +
        "\n\nRemoto: " + $remoto +
        "\n\nSi el repositorio es PRIVADO, adelante. Si es o va a ser PÚBLICO," +
        " arregla esto antes del push: ponlo privado, o sustituye la semilla por" +
        " datos ficticios y deja el CV real como JSON importable fuera de git."
      )
    }
  }'
