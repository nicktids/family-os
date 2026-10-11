import { createApiClient } from '@famos/api-client';

/** The single API client instance; same-origin (the server also serves this SPA). */
export const api = createApiClient();
