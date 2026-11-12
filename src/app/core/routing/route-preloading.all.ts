import { PreloadAllModules, withPreloading, type RouterFeatures } from '@angular/router';

// Variante de comparación: ng build --configuration production,preloading.
export const ROUTE_PRELOADING: RouterFeatures[] = [withPreloading(PreloadAllModules)];
