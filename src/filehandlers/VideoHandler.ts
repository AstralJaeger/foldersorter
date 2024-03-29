import { createLogger, Logger } from '@lvksh/logger';
import child_process from 'node:child_process';
import fs, { promises as fsp, Stats } from 'node:fs';
import path from 'node:path';

import { logMethods } from '../config';
import { Handler } from './Handler';

export class VideoHandler extends Handler {
    private static readonly TARGET_FOLDER = 'Videos';
    private static readonly TARGET_EXTENSION = 'mp4';

    private readonly log: Logger<string>;
    private readonly targetDirectory: string;
    private readonly statisticsEmitter: EventTarget;

    public name: string = VideoHandler.name;

    constructor(private readonly sourcePath: string) {
        super();
        this.log = createLogger(
            logMethods,
            { padding: 'PREPEND' },
            console.log
        );

        this.statisticsEmitter = new EventTarget();

        this.targetDirectory = path.join(
            this.sourcePath,
            VideoHandler.TARGET_FOLDER
        );

        if (!fs.existsSync(this.targetDirectory)) {
            fs.mkdirSync(this.targetDirectory);
        }
    }

    static create(sourcePath: string): Handler {
        return new VideoHandler(sourcePath);
    }

    async getSupportedFileTypes(): Promise<string[]> {
        return [
            'mov',
            'webm',
            'webp',
            'gif',
            'hevc',
            'flv',
            'mkv',
            '3gpp',
            'mp4',
        ];
    }

    private async runCommand(command: string[]): Promise<void> {
        return new Promise((resolve, reject) => {
            const child = child_process.spawn(command.at(0), command.slice(1));

            const output = '';

            child.stdout.setEncoding('utf8');
            child.stdout.on('data', (data) => this.log.debug(data));
            child.stderr.setEncoding('utf8');
            child.stdout.on('data', (data) => this.log.error(data));

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
        this.log.info(`[${VideoHandler.name}] Handling file: ${fullFilePath}`);
        const promises = [];
        const targetFile = path.join(
            this.targetDirectory,
            `${fileHash}.${VideoHandler.TARGET_EXTENSION}`
        );

        if (
            extension !== VideoHandler.TARGET_EXTENSION &&
            !fs.existsSync(targetFile)
        ) {
            // Generate mp4 equivalent
            const childConvCmd: string[] = [
                'ffmpeg',
                '-i',
                fullFilePath,
                '-c:v',
                'libx265',
                '-preset',
                'faster',
                '-c:a',
                'aac',
                '-b:a',
                '96k',
                targetFile,
            ];

            promises.push(this.runCommand(childConvCmd));
            this.statisticsEmitter.dispatchEvent(new Event('conversion'));
        }

        promises.push(
            fsp.copyFile(
                fullFilePath,
                path.join(this.targetDirectory, `${fileHash}.${extension}`)
            )
        );
        await Promise.allSettled(promises);
        await fsp.unlink(fullFilePath);
        this.statisticsEmitter.dispatchEvent(new Event('file_handle'));
        await Promise.resolve();
    }
}
