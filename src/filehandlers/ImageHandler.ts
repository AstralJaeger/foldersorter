import { createLogger, Logger } from '@lvksh/logger';
import * as child_process from 'node:child_process';
import { ChildProcessWithoutNullStreams } from 'node:child_process';
import { Stats } from 'node:fs';
import fs, { PathLike, promises as fsp } from 'node:fs';
import path from 'node:path';

import { logMethods } from '../config';
import { fileSizeInMB, Handler } from './Handler';
import EventEmitter from "events";

export class ImageHandler extends Handler {
    private static readonly TARGET_FOLDER = 'Images';
    private static readonly MAX_IMAGE_SIZE = 8; // In MB
    private static readonly TARGET_EXTENSION = 'png';
    private static readonly THUMBNAIL_SUFFIX = '_thumbnail';

    private readonly log: Logger<string>;
    private readonly targetDirectory: string;
    private readonly statisticsEmitter: EventEmitter;

    public name: string = ImageHandler.name;

    private constructor(sourceDirectory: string) {
        super();
        this.log = createLogger(
            logMethods,
            { padding: 'PREPEND' },
            console.log
        );

        this.statisticsEmitter = new EventEmitter();

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
        const childCmd = ['magick', 'identify', '-list', 'Format'];
        const child = child_process.spawn(childCmd.at(0), childCmd.slice(1));
        const childOutput = await this.readStdout(child);

        const lines = childOutput.split("\r\n").slice(2).map((line) => line.trim().toLowerCase());
        const supportedFormats: string[] = [];
        const pattern = new RegExp(/([\w-]+\*?)\s*(\w+)\s*(r..)\s*(.*)/g);

        for (const line of lines) {
            if (line.match(pattern)) {
                const matches = [...line.matchAll(pattern)].flat();

                supportedFormats.push(
                    matches.at(1).replace('*', '')
                );
            }
        }
        this.log.info(
            `ImageHandler ${
                supportedFormats.length
            } supported formats: ${supportedFormats
                .slice(0, supportedFormats.length)
                .join(', ')}`
        );

        return supportedFormats;
    }

    private async readStdout(
        process: ChildProcessWithoutNullStreams
    ): Promise<String> {
        // I won't handle errors, but you could maybe idk
        return new Promise((resolve, reject) => {
            let output = '';

            process.stdout.setEncoding('utf8');
            process.stdout.on('data', (data) => {
                output += data;
            });

            process.stdout.on('close', () => resolve(output));

            process.on('error', (err) => reject(err));
        });
    }

    private async runCommand(command: string[]): Promise<void>{
        return new Promise((resolve, reject) => {
            const child = child_process.spawn(command[0], command.slice(1));
            child.on("exit", (code, _signal) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(`Non-zero exit code: ${code}`)
                }
            });
            child.on("error", (error) => {
                reject(`Error running command: ${error}`);
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
            // Generate thumbnail & png equivalent
            const childThumbCmd: string[] = ["magick", `${fullFilePath}`, "-resize", "720x720", path.join(this.targetDirectory, `${fileHash}${ImageHandler.THUMBNAIL_SUFFIX}.${ImageHandler.TARGET_EXTENSION}`)];
            const thumbChild = child_process.spawn(childThumbCmd[0], childThumbCmd.slice(1));
            const response = await this.readStdout(thumbChild);
            this.log.error(response);

            await this.runCommand(childThumbCmd);
            this.statisticsEmitter.emit("thumbnail");
            const childConvCmd: string[] = ["magick", `${fullFilePath}`, path.join(this.targetDirectory, `${fileHash}.${ImageHandler.TARGET_EXTENSION}`)];
            await this.runCommand(childConvCmd);
            this.statisticsEmitter.emit("conversion");
        }
        await fsp.copyFile(fullFilePath, path.join(this.targetDirectory, `${fileHash}.${extension}`));
        // await fsp.unlink(fullFilePath);
        this.statisticsEmitter.emit("file_handle");
        this.log.info(`Handled file: ${fullFilePath}`);
        await Promise.resolve();
    }
}
