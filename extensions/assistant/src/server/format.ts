import { formatDate } from '@famos/time';

/** The English weekday name of a date (`YYYY-MM-DD`), for the prompt. */
export const formatWeekday = (date: string) => formatDate(date, 'en', { weekday: 'long' });
