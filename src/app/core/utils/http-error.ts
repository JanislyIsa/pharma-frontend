import { HttpErrorResponse } from '@angular/common/http';
import { ErrorResponse } from '../models/error-response';

export function mensajeError(err: HttpErrorResponse): string {
  if (err.status === 0) {
    return 'No se pudo conectar con PharmaBackend. Verifica que esté en ejecución y que CORS permita http://localhost:4200.';
  }
  const cuerpo = err.error as ErrorResponse | null;
  const mensaje = cuerpo?.message ?? `Error ${err.status}: ${err.statusText}`;
  return cuerpo?.requestId
    ? `${mensaje} Código de seguimiento: ${cuerpo.requestId}`
    : mensaje;
}

export function erroresDeValidacion(err: HttpErrorResponse): Record<string, string> {
  const cuerpo = err.error as ErrorResponse | null;
  return cuerpo?.validationErrors ?? {};
}
