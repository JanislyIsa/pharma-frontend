export function paginaDesdeUrl(valor: unknown): number {
  const numero = Number(valor);
  return Number.isSafeInteger(numero) && numero >= 0 ? numero : 0;
}

export function tamanioDesdeUrl(valor: unknown): number {
  const numero = Number(valor);
  return Number.isSafeInteger(numero) && numero >= 1 && numero <= 100 ? numero : 20;
}

export function idDesdeUrl(valor: unknown): number | null {
  const numero = Number(valor);
  return Number.isSafeInteger(numero) && numero > 0 ? numero : null;
}

export function direccionDesdeUrl(valor: unknown): 'asc' | 'desc' {
  return valor === 'desc' ? 'desc' : 'asc';
}
