/** iCalendar fixtures, written the way real feeds look. */
export const ics = (...lines: string[]) => `${lines.join('\r\n')}\r\n`;

export const ISTANBUL = [
	'BEGIN:VTIMEZONE',
	'TZID:Europe/Istanbul',
	'BEGIN:STANDARD',
	'DTSTART:19700101T000000',
	'TZOFFSETFROM:+0300',
	'TZOFFSETTO:+0300',
	'TZNAME:+03',
	'END:STANDARD',
	'END:VTIMEZONE',
];

/** A school calendar: a timed event with VTIMEZONE and a multi-day break. */
export const school = ics(
	'BEGIN:VCALENDAR',
	'VERSION:2.0',
	'PRODID:-//School//EN',
	...ISTANBUL,
	'BEGIN:VEVENT',
	'UID:parents-evening@school.example',
	'DTSTAMP:20261001T000000Z',
	'DTSTART;TZID=Europe/Istanbul:20261020T180000',
	'DTEND;TZID=Europe/Istanbul:20261020T190000',
	'SUMMARY:Veli toplantısı\\, 4-B',
	'LOCATION:Okul binası; A blok',
	'DESCRIPTION:Karne notları\\nGetirmeyi unutmayın',
	'END:VEVENT',
	'BEGIN:VEVENT',
	'UID:winter-break@school.example',
	'DTSTAMP:20261001T000000Z',
	'DTSTART;VALUE=DATE:20270118',
	'DTEND;VALUE=DATE:20270130',
	'SUMMARY:Yarıyıl tatili',
	'END:VEVENT',
	'END:VCALENDAR',
);

/**
 * Thursdays 09:00 in Istanbul, from 2026-10-08. 10-15 is excluded, 10-22 moved to Friday 10:00
 * under a new title, 10-29 cancelled.
 */
export const weekly = ics(
	'BEGIN:VCALENDAR',
	'VERSION:2.0',
	'PRODID:-//Club//EN',
	...ISTANBUL,
	'BEGIN:VEVENT',
	'UID:swim@club.example',
	'DTSTAMP:20261001T000000Z',
	'DTSTART;TZID=Europe/Istanbul:20261008T090000',
	'DTEND;TZID=Europe/Istanbul:20261008T100000',
	'RRULE:FREQ=WEEKLY;BYDAY=TH;UNTIL=20261231T000000Z',
	'EXDATE;TZID=Europe/Istanbul:20261015T090000',
	'SUMMARY:Yüzme',
	'END:VEVENT',
	'BEGIN:VEVENT',
	'UID:swim@club.example',
	'DTSTAMP:20261001T000000Z',
	'RECURRENCE-ID;TZID=Europe/Istanbul:20261022T090000',
	'DTSTART;TZID=Europe/Istanbul:20261023T100000',
	'DTEND;TZID=Europe/Istanbul:20261023T110000',
	'SUMMARY:Yüzme (taşındı)',
	'END:VEVENT',
	'BEGIN:VEVENT',
	'UID:swim@club.example',
	'DTSTAMP:20261001T000000Z',
	'RECURRENCE-ID;TZID=Europe/Istanbul:20261029T090000',
	'DTSTART;TZID=Europe/Istanbul:20261029T090000',
	'STATUS:CANCELLED',
	'SUMMARY:Yüzme',
	'END:VEVENT',
	'END:VCALENDAR',
);

/** A public holiday: all-day, no DTEND. */
export const holiday = ics(
	'BEGIN:VCALENDAR',
	'VERSION:2.0',
	'PRODID:-//Holidays//EN',
	'BEGIN:VEVENT',
	'UID:republic-day@holidays.example',
	'DTSTAMP:20261001T000000Z',
	'DTSTART;VALUE=DATE:20261029',
	'SUMMARY:Cumhuriyet Bayramı',
	'END:VEVENT',
	'END:VCALENDAR',
);

/** An event without a zone: it means the family's wall clock. */
export const floating = ics(
	'BEGIN:VCALENDAR',
	'VERSION:2.0',
	'PRODID:-//Nas//EN',
	'BEGIN:VEVENT',
	'UID:floating@nas.example',
	'DTSTAMP:20261001T000000Z',
	'DTSTART:20261010T100000',
	'DTEND:20261010T110000',
	'SUMMARY:Kombi servisi',
	'END:VEVENT',
	'END:VCALENDAR',
);

/** What Google's secret address serves: UTC times, a weekly series, a calendar name. */
export const google = ics(
	'BEGIN:VCALENDAR',
	'PRODID:-//Google Inc//Google Calendar 70.9054//EN',
	'VERSION:2.0',
	'CALSCALE:GREGORIAN',
	'METHOD:PUBLISH',
	'X-WR-CALNAME:Work',
	'X-WR-TIMEZONE:Europe/Istanbul',
	'BEGIN:VEVENT',
	'DTSTART:20261012T070000Z',
	'DTEND:20261012T080000Z',
	'RRULE:FREQ=WEEKLY;BYDAY=MO;COUNT=3',
	'DTSTAMP:20261007T080000Z',
	'UID:abc123@google.com',
	'CREATED:20260901T080000Z',
	'LAST-MODIFIED:20260901T080000Z',
	'SEQUENCE:0',
	'STATUS:CONFIRMED',
	'SUMMARY:Standup',
	'TRANSP:OPAQUE',
	'END:VEVENT',
	'END:VCALENDAR',
);

/** An Outlook-style series in a zone only the feed defines. */
export const windowsZone = ics(
	'BEGIN:VCALENDAR',
	'VERSION:2.0',
	'PRODID:-//Outlook//EN',
	'BEGIN:VTIMEZONE',
	'TZID:Turkey Standard Time',
	'BEGIN:STANDARD',
	'DTSTART:16010101T000000',
	'TZOFFSETFROM:+0300',
	'TZOFFSETTO:+0300',
	'END:STANDARD',
	'END:VTIMEZONE',
	'BEGIN:VEVENT',
	'UID:outlook@work.example',
	'DTSTAMP:20261001T000000Z',
	'DTSTART;TZID=Turkey Standard Time:20261013T150000',
	'DTEND;TZID=Turkey Standard Time:20261013T160000',
	'RRULE:FREQ=WEEKLY;BYDAY=TU;COUNT=4',
	'SUMMARY:Haftalık görüşme',
	'END:VEVENT',
	'END:VCALENDAR',
);
