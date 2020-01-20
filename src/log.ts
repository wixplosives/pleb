import { green, yellow, red } from 'chalk';

/* eslint-disable no-console */
export const log = (message: unknown) => console.log(`${green('#')} ${message}`);
export const logWarn = (message: unknown) => console.log(`${yellow('#')} ${message}`);
export const logError = (message: unknown) => console.log(red(`# ${message}`));
/* eslint-enable no-console */
