import chalk from 'chalk';

export const logMethods = {
    info: {
        label: chalk.cyan`[INFO]`,
        newLine: chalk.cyan`⮡`,
        newLineEnd: chalk.cyan`⮡`,
    },
    ok: {
        label: chalk.greenBright`[OK]`,
        newLine: '| ',
        newLineEnd: '\\-',
    },
    error: {
        label: chalk.red`[ERROR]`,
        newLine: chalk.red`⮡`,
        newLineEnd: chalk.red`⮡`,
    },
    debug: chalk.magentaBright`[DEBUG]`,
};
