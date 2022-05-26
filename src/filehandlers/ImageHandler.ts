import { createLogger, Logger } from '@lvksh/logger';
import * as child_process from 'node:child_process';
import { ChildProcessWithoutNullStreams } from 'node:child_process';
import { Stats } from 'node:fs';
import fs, { promises as fsp } from 'node:fs';
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
        return ["webp", "png", "jpg", "jpeg", "bmp", "svg", "eps", "psd", "ai"];
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

            let output = "";
            child.stdout.setEncoding("utf8");
            child.stdout.on("data", (data) => output += data);
            child.stderr.setEncoding("utf8");
            child.stdout.on("data", (data) => output += data);

            child.on("close", (code, _signal) => {
                if (code === 0) {
                    resolve();
                } else {
                    const msg = `Non-zero exit code: ${code}. Message: ${output}`;
                    this.log.error(msg)
                    reject(msg);
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
            // Generate thumbnail & png equivalent
            const childThumbCmd: string[] = ["magick", `${fullFilePath}`, "-flatten", "-resize", "720x720>", "-quality", "95", "-font", "Tahoma", "-pointsize", "10", "-fill", "#cccb", "-stroke", "black", "-strokewidth", "4", "-annotate", "+2+12", "@astraljaeger\/foldersorter", "-fill", "#fffb", "-stroke", "none", "-annotate", "+2+12", "@astraljaeger\/foldersorter", path.join(this.targetDirectory, `${fileHash}${ImageHandler.THUMBNAIL_SUFFIX}.${ImageHandler.TARGET_EXTENSION}`)];
            const thumbChild = child_process.spawn(childThumbCmd[0], childThumbCmd.slice(1));
            const response = await this.readStdout(thumbChild);
            if (response.trim() !== "") {
                this.log.debug(response);
            }
            await this.runCommand(childThumbCmd);
            this.statisticsEmitter.emit("thumbnail");
        }

        if (extension !== ImageHandler.TARGET_EXTENSION){
            const childConvCmd: string[] = ["magick", `${fullFilePath}`, "-flatten", path.join(this.targetDirectory, `${fileHash}.${ImageHandler.TARGET_EXTENSION}`)];
            await this.runCommand(childConvCmd);
            this.statisticsEmitter.emit("conversion");
        }

        await fsp.copyFile(fullFilePath, path.join(this.targetDirectory, `${fileHash}.${extension}`));
        await fsp.unlink(fullFilePath);
        this.statisticsEmitter.emit("file_handle");
        await Promise.resolve();
    }
}
