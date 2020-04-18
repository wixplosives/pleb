import readline from 'readline';

const { stdout } = process;

export interface CliProgressBarOptions {
    /** @default 20 */
    barWidth?: number;
    /** @default '\u2591' (faded square) */
    pending?: string;
    /** @default '\u2588' (opaque square) */
    complete?: string;
    /** @default '[' */
    prefix?: string;
    /** @default ']' */
    postfix?: string;
    /** @default `${percent}%` */
    message?: (current: number) => string | undefined;
}

export function createCliProgressBar({
    barWidth = 20,
    pending = '\u2591', // faded square
    complete = '\u2588', // opaque square
    prefix = '[',
    postfix = ']',
    message = numberAsPercent,
}: CliProgressBarOptions = {}) {
    update(0);

    /**
     * @param current a number between 0 and 1 representing the progress
     * @param messageText custom message to show for this specific update
     */
    function update(current: number, messageText = message(current)) {
        const completeWidth = Math.round(current * barWidth);
        readline.cursorTo(stdout, 0);
        stdout.write(prefix);
        for (let pos = 0; pos < barWidth; ++pos) {
            stdout.write(pos < completeWidth ? complete : pending);
        }
        stdout.write(`${postfix} `);
        if (messageText) {
            stdout.write(`${messageText} `);
        }
        if (stdout.isTTY) {
            readline.clearLine(stdout, 1);
        } else {
            stdout.write('\n');
        }
    }

    function done(messageText = message(1)) {
        update(1, messageText);
        if (stdout.isTTY) {
            stdout.write('\n');
        }
    }

    return {
        update,
        done,
    };
}

function numberAsPercent(value: number) {
    return `${Math.round(Math.min(value * 100, 100))}%`;
}
