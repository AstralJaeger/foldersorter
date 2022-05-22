import { createLogger, Logger } from '@lvksh/logger';
import child_process, {
    ChildProcessWithoutNullStreams,
} from 'node:child_process';
import fs, { Stats } from 'node:fs';
import { PathLike } from 'node:fs';

import { logMethods } from '../config';
import { Handler } from './Handler';
import path from "node:path";

export class VideoHandler extends Handler {

    private static readonly TARGET_FOLDER = 'Videos';

    private readonly log: Logger<string>;
    private readonly targetDirectory: string;

    public name: string = VideoHandler.name;

    constructor(private readonly sourcePath: string) {
        super();
        this.log = createLogger(
            logMethods,
            { padding: 'PREPEND' },
            console.log
        );

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
        const childCmd = ['ffmpeg', '-formats'];
        const child = child_process.spawn(childCmd.at(0), childCmd.slice(1));
        const output = await this.readStdout(child);
        const lines = output.split('\n').map((line) => line.trim().toLowerCase());
        const supportedFormats: string[] = [];
        const pattern = new RegExp(/(de?)\s+(\w+)\s+(.*)/g);

        for (const line of lines.slice(3)) {
            if (line.match(pattern)) {
                const matches = [...line.matchAll(pattern)].flat(1);
                supportedFormats.push(matches.at(2));
            }
        }
        this.log.info(
            `VideoHandler ${
                supportedFormats.length
            } supported formats: ${supportedFormats
                .slice(0, Math.min(25, supportedFormats.length))
                .join(', ')}...`
        );

        return supportedFormats;
    }

    private async readStdout(
        process: ChildProcessWithoutNullStreams
    ): Promise<String> {
        // I won't handle errors, but you could maybe idk
        return new Promise((resolve) => {
            let output = '';

            process.stdout.setEncoding('utf8');
            process.stdout.on('data', (data) => {
                output += data;
            });

            process.stdout.on('close', () => resolve(output));
        });
    }

    async handle(
        fullFilePath: PathLike,
        extension: String,
        fileStats: Stats,
        fileHash: string
    ): Promise<void> {
        this.log.info(`[${VideoHandler.name}] Handling file: ${fullFilePath}`);
    }
}
