import { green, yellow, red } from 'chalk';

export const log = (message: string) => console.log(`${green('#')} ${message}`);
export const logWarn = (message: string) => console.log(`${yellow('#')} ${message}`);
export const logError = (message: string) => console.log(red(`# ${message}`));
