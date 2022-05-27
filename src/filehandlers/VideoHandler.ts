import { createLogger, Logger } from '@lvksh/logger';
import child_process, {
    ChildProcessWithoutNullStreams,
} from 'node:child_process';
import fs, {promises as fsp, Stats} from 'node:fs';
import { PathLike } from 'node:fs';

import { logMethods } from '../config';
import {fileSizeInMB, Handler} from './Handler';
import path from "node:path";
import EventEmitter from "events";

export class VideoHandler extends Handler {

    private static readonly TARGET_FOLDER = 'Videos';
    private static readonly TARGET_EXTENSION = 'mp4';

    private readonly log: Logger<string>;
    private readonly targetDirectory: string;
    private readonly statisticsEmitter: EventEmitter;

    public name: string = VideoHandler.name;

    constructor(private readonly sourcePath: string) {
        super();
        this.log = createLogger(
            logMethods,
            { padding: 'PREPEND' },
            console.log
        );

        this.statisticsEmitter = new EventEmitter();

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
        return ["mov", "webm", "gif", "hevc", "flv", "mkv", "mp4"];
    }

    private async runCommand(command: string[]): Promise<void>{
        return new Promise((resolve, reject) => {
            const child = child_process.spawn(command[0], command.slice(1));

            let output = "";
            child.stdout.setEncoding("utf8");
            child.stdout.on("data", (data) => this.log.debug(data));
            child.stderr.setEncoding("utf8");
            child.stdout.on("data", (data) => this.log.error(data));

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
        this.log.info(`[${VideoHandler.name}] Handling file: ${fullFilePath}`);
        const promises = [];
        const targetFile = path.join(this.targetDirectory, `${fileHash}.${VideoHandler.TARGET_EXTENSION}`);
        if (extension !== VideoHandler.TARGET_EXTENSION && !fs.existsSync(targetFile)) {
            // Generate mp4 equivalent
            const childConvCmd: string[] = ["ffmpeg", "-i", fullFilePath, targetFile];
            this.log.info(`Converting with command: ${childConvCmd.join(" ")}`)
            promises.push(this.runCommand(childConvCmd));
            this.statisticsEmitter.emit("conversion");
        }

        promises.push(fsp.copyFile(fullFilePath, path.join(this.targetDirectory, `${fileHash}.${extension}`)));
        await Promise.allSettled(promises);
        await fsp.unlink(fullFilePath);
        this.statisticsEmitter.emit("file_handle");
        await Promise.resolve();
    }
}
