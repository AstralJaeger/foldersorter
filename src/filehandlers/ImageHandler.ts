import { createLogger, Logger } from '@lvksh/logger';
import * as child_process from 'node:child_process';
import fs, { promises as fsp,Stats } from 'node:fs';
import path from 'node:path';

import { logMethods } from '../config';
import { fileSizeInMB, Handler } from './Handler';

export class ImageHandler extends Handler {
    private static readonly TARGET_FOLDER = 'Images';
    private static readonly MAX_IMAGE_SIZE = 8; // In MB
    private static readonly TARGET_EXTENSION = 'png';
    private static readonly THUMBNAIL_SUFFIX = '_thumbnail';

    private readonly log: Logger<string>;
    private readonly targetDirectory: string;
    private readonly statisticsEmitter: EventTarget;
    private _model: any;

    public name: string = ImageHandler.name;

    private constructor(sourceDirectory: string) {
        super();
        this.log = createLogger(
            logMethods,
            { padding: 'PREPEND' },
            console.log
        );

        this.statisticsEmitter = new EventTarget();

        this.targetDirectory = path.join(
            sourceDirectory,
            ImageHandler.TARGET_FOLDER
        );

        if (!fs.existsSync(this.targetDirectory)) {
            fs.mkdirSync(this.targetDirectory);
        }
    }

    static create(sourceDirectory: string): Handler {
        return new ImageHandler(sourceDirectory);
    }

    async getSupportedFileTypes(): Promise<string[]> {
        return ['png', 'jpg', 'jpeg', 'bmp', 'svg', 'eps', 'psd', 'ai', 'heic'];
    }

    private async runCommand(command: string[]): Promise<void> {
        return new Promise((resolve, reject) => {
            const child = child_process.spawn(command.at(0), command.slice(1));
            let output = '';

            child.stdout.setEncoding('utf8');
            child.stdout.on('data', (data) => (output += data));
            child.stderr.setEncoding('utf8');
            child.stdout.on('data', (data) => (output += data));

            child.on('close', (code, _signal) => {
                if (code === 0) {
                    resolve();
                } else {
                    const message = `Non-zero exit code: ${code}. Message: ${output}`;

                    this.log.error(message);
                    reject(message);
                }
            });
        });
    }

    async handle(
        fullFilePath: string,
        extension: string,
        fileStats: Stats,
        fileHash: string
    ): Promise<void> {
        this.log.info(`[${ImageHandler.name}] Handling file: ${fullFilePath}`);

        if (
            extension !== ImageHandler.TARGET_EXTENSION ||
            fileSizeInMB(fileStats.size) > ImageHandler.MAX_IMAGE_SIZE
        ) {
            // Generate png thumbnail (720P long axis, lower quality, watermark)
            const childThumbCmd: string[] = [
                'magick',
                `${fullFilePath}`,
                '-flatten',
                '-resize',
                '720x720>',
                '-quality',
                '95',
                '-font',
                'Tahoma',
                '-pointsize',
                '10',
                '-fill',
                '#cccb',
                '-stroke',
                '#cccb',
                '-strokewidth',
                '4',
                '-annotate',
                '+2+12',
                '@astraljaeger/foldersorter',
                '-fill',
                '#fffb',
                '-stroke',
                'none',
                '-annotate',
                '+2+12',
                '@astraljaeger/foldersorter',
                path.join(
                    this.targetDirectory,
                    `${fileHash}${ImageHandler.THUMBNAIL_SUFFIX}.${ImageHandler.TARGET_EXTENSION}`
                ),
            ];

            await this.runCommand(childThumbCmd);
            this.statisticsEmitter.dispatchEvent(new Event('thumbnail'));
        }

        if (extension !== ImageHandler.TARGET_EXTENSION) {
            // Generate png equivalent
            const childConvCmd: string[] = [
                'magick',
                `${fullFilePath}`,
                '-flatten',
                path.join(
                    this.targetDirectory,
                    `${fileHash}.${ImageHandler.TARGET_EXTENSION}`
                ),
            ];

            await this.runCommand(childConvCmd);
            this.statisticsEmitter.dispatchEvent(new Event('conversion'));
        }

        await fsp.copyFile(
            fullFilePath,
            path.join(this.targetDirectory, `${fileHash}.${extension}`)
        );
        await fsp.unlink(fullFilePath);
        this.statisticsEmitter.dispatchEvent(new Event('file_handle'));
        await Promise.resolve();
    }
}
