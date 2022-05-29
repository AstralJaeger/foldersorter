import { createLogger, Logger } from '@lvksh/logger';
import fs, {promises as fsp, Stats} from 'node:fs';
import path from 'node:path';

import { logMethods } from '../config';
import { Handler } from './Handler';
import EventEmitter from "events";

export class ExecutableHandler extends Handler {
    private static readonly TARGET_FOLDER = 'Executables';
    private readonly log: Logger<string>;
    private readonly targetDirectory: string;
    private readonly statisticsEmitter: EventEmitter;
    public name: string = ExecutableHandler.name;

    private constructor(private readonly sourcePath: string) {
        super();
        this.log = createLogger(
            logMethods,
            { padding: 'PREPEND' },
            console.log
        );

        this.statisticsEmitter = new EventEmitter();

        this.targetDirectory = path.join(
            sourcePath,
            ExecutableHandler.TARGET_FOLDER
        );

        if (!fs.existsSync(this.targetDirectory)) {
            fs.mkdirSync(this.targetDirectory);
        }
    }

    static create(sourcePath: string): Handler {
        return new ExecutableHandler(sourcePath);
    }

    async getSupportedFileTypes(): Promise<string[]> {
        return ['exe', 'msi'];
    }

    async handle(
        fullFilePath: string,
        extension: string,
        fileStat: Stats,
        fileHash: string
    ): Promise<void> {
        this.log.info(`[${ExecutableHandler.name}] Handling file: ${fullFilePath}`);
        await fsp.copyFile(fullFilePath, path.join(this.targetDirectory, `${fileHash}.${extension}`));
        await fsp.unlink(fullFilePath);
        this.statisticsEmitter.emit("file_handle");
    }
}
