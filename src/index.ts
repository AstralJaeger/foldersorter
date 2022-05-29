import { createLogger } from '@lvksh/logger';
import chalk from 'chalk';
import fs, { promises as fsp } from 'node:fs';
import path from 'node:path';

import { Handler } from './filehandlers/Handler';
import { ImageHandler } from './filehandlers/ImageHandler';
import { VideoHandler } from './filehandlers/VideoHandler';
import { ArchiveHandler } from './filehandlers/ArchiveHandler';
import { ExecutableHandler } from './filehandlers/ExecutableHandler';
import { hashFile } from './hashing';


const folder = process.env.FOLDER_PATH;

const log = createLogger(
    {
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
        warning: {
            label: chalk.yellow`[warn]`,
            newLine: chalk.yellow`⮡`,
            newLineEnd: chalk.yellow`⮡`,
        },
    },
    { padding: 'PREPEND' },
    console.log
);

async function sortFolder(
    folderPath: string,
    fileTypeMappings: Map<string, Handler>
): Promise<void> {
    const files: fs.Dirent[] = await fsp.readdir(folderPath, {
        withFileTypes: true,
        encoding: 'utf8',
    });
    const duplicateMap = new Map<string, string>();

    for (const file of files) {
        if (file.isDirectory()) {
            await handleDirectory(path.join(folderPath, file.name));
        } else if (file.isFile()) {
            await handleFile(folderPath, file, duplicateMap, fileTypeMappings);
        }
    }
}

async function handleFile(
    folderPath: string,
    file: fs.Dirent,
    duplicateMap: Map<string, string>,
    fileTypeMappings: Map<string, Handler>
): Promise<void> {
    const fullFilePath = path.join(folderPath, file.name);
    const extension = path.extname(fullFilePath).replace('.', '').toLowerCase();
    const stat = await fsp.stat(fullFilePath);
    const fileHash = await hashFile(fullFilePath);

    if (duplicateMap.has(fileHash)) {
        await handleDuplicate(fullFilePath, stat, fileHash, duplicateMap);
    } else if (fileTypeMappings.has(extension)) {
        await fileTypeMappings
            .get(extension)
            .handle(fullFilePath, extension, stat, fileHash);
    } else {
        log.info(`No handler found for ${extension}`);
    }
}

async function handleDirectory(directoryPath: string) {
    log.info(`handling directory ${directoryPath}`);
}

async function handleDuplicate(
    filePath: string,
    stat: fs.Stats,
    fileHash: string,
    duplicateMap: Map<string, string>
) {
    log.info(`handling duplicate: ${filePath}`);
}

async function registerFileTypeMappings(
    handlers: Handler[]
): Promise<Map<string, Handler>> {
    const fileTypeMappings: Map<string, Handler> = new Map<string, Handler>();

    for (const handler of handlers) {
        const supportedFormats = await handler.getSupportedFileTypes();
        for (const format of supportedFormats) {
            if (fileTypeMappings.has(format)) {
                log.warning(`Duplicate file type mapping: ${format} current: ${fileTypeMappings.get(format).name} new: ${handler.name}`);
            }
            fileTypeMappings.set(format, handler);
        }
    }

    return fileTypeMappings;
}

// Automatically detect supported formats by function and add them automatically
const handlers: Handler[] = [
    ImageHandler.create(folder),
    ArchiveHandler.create(folder),
    ExecutableHandler.create(folder),
    VideoHandler.create(folder),
];

registerFileTypeMappings(handlers)
    .then((mappings) => {
        log.info('FileTypeMappings registered');
        sortFolder(folder, mappings)
            .then(() => console.log('Done.'))
            .catch((error) => console.error(error));
    })
    .catch((error) => log.error(error));
