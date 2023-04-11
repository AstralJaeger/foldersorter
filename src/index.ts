import { createLogger } from '@lvksh/logger';
import chalk from 'chalk';
import { watch } from 'chokidar';
import fs, { promises as fsp } from 'node:fs';
import path from 'node:path';

import { ArchiveHandler } from './filehandlers/ArchiveHandler';
import { ExecutableHandler } from './filehandlers/ExecutableHandler';
import { Handler } from './filehandlers/Handler';
import { ImageHandler } from './filehandlers/ImageHandler';
import { PortableDocumentHandler } from './filehandlers/PortableDocumentHandler';
import { VideoHandler } from './filehandlers/VideoHandler';
import { hashFile } from './hashing';

const HANDLE_DELAY = 60_000;
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
    fileTypeMappings: Map<string, Handler>,
    duplicateMap: Map<string, string>
): Promise<void> {
    const files: fs.Dirent[] = await fsp.readdir(folderPath, {
        withFileTypes: true,
        encoding: 'utf8',
    });

    for (const file of files) {
        if (file.isDirectory()) {
            await handleDirectory(path.join(folderPath, file.name));
        } else if (file.isFile()) {
            await handleFile(
                folderPath,
                file.name,
                duplicateMap,
                fileTypeMappings
            );
        }
    }
}

async function handleFile(
    folderPath: string,
    fileName: string,
    duplicateMap: Map<string, string>,
    fileTypeMappings: Map<string, Handler>
): Promise<void> {
    const fullFilePath = path.join(folderPath, fileName);
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
    _stat: fs.Stats,
    _fileHash: string,
    _duplicateMap: Map<string, string>
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
                log.warning(
                    `Duplicate file type mapping: ${format} current: ${
                        fileTypeMappings.get(format).name
                    } new: ${handler.name}`
                );
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
    PortableDocumentHandler.create(folder),
];

registerFileTypeMappings(handlers)
    .then((mappings) => {
        const duplicateMap = new Map<string, string>();

        log.info('FileTypeMappings registered');
        sortFolder(folder, mappings, duplicateMap)
            .then(() => log.info('Initial sorting done.'))
            .catch((error) => console.error(error));

        log.info('Starting file watcher');
        const watcher = watch(`${folder}*`, {
            persistent: true,
            ignoreInitial: true,
            followSymlinks: false,
            depth: 1,
        });

        watcher.on('add', async (fullfilePath) => {
            const stat = fs.statSync(fullfilePath);

            setTimeout(async () => {
                if (stat.isFile()) {
                    log.info(`File ${fullfilePath} has been added`);
                    await handleFile(
                      folder,
                      fullfilePath.slice(fullfilePath.lastIndexOf(path.sep) + 1),
                      duplicateMap,
                      mappings
                    );
                } else {
                    log.debug(`Ignoring directory ${fullfilePath} has been added`);
                }
            }, HANDLE_DELAY);
        });
    })
    .catch((error) => log.error(error));
