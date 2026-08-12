#!/usr/bin/env bash
# Detector ÚNICO de datos personales reales en el árbol de trabajo.
#
# Fuente de verdad compartida por los dos avisos de push:
#   · .claude/hooks/avisar-datos-personales.sh  (cuando el push lo lanza Claude)
#   · .githooks/pre-push                        (cuando lo lanzas tú a mano)
# Duplicar esta lógica ya nos coló un falso negativo una vez; no la copies.
#
# Las reglas son GENÉRICAS a propósito. Una versión anterior buscaba el teléfono
# y el email concretos de una persona, con lo que este mismo fichero publicaba
# los datos que pretendía proteger. Aquí no hay ni un dato real: se comprueba la
# FORMA (dominio reservado, teléfono placeholder, foto conocida).
#
# Contrato: imprime un hallazgo por línea y sale 0 SIEMPRE.
# Salida vacía = el repo está limpio y se puede publicar.
set -uo pipefail

root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
seed="$root/src/core/seed.ts"

# Dominios reservados para documentación (RFC 2606) y el teléfono placeholder.
readonly EMAIL_OK='@example\.(com|org|net)'
readonly TEL_OK='\+34600123456'
readonly FOTO_OK='avatar-ejemplo.png'

if [ -f "$seed" ]; then
  # Cualquier email de la semilla que no sea de un dominio reservado.
  if grep -oE "[[:alnum:]._%+-]+@[[:alnum:].-]+\.[[:alpha:]]{2,}" "$seed" |
    grep -qvE "$EMAIL_OK"; then
    echo 'src/core/seed.ts — email de aspecto real (usa un dominio @example.com)'
  fi

  # Cualquier `tel:` que no sea el placeholder.
  if grep -oE "tel:\+?[0-9 ]{6,}" "$seed" | grep -qvE "$TEL_OK"; then
    echo 'src/core/seed.ts — teléfono de aspecto real (usa el placeholder)'
  fi
fi

# Una imagen que no sea el avatar de ejemplo casi seguro es la foto de alguien.
while IFS= read -r img; do
  [ -z "$img" ] && continue
  echo "src/assets/$(basename "$img") — imagen desconocida, ¿es la foto de una persona real?"
done < <(find "$root/src/assets" -type f \( -iname '*.png' -o -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.webp' \) ! -name "$FOTO_OK" 2>/dev/null)

exit 0
