import { createLogger, Logger } from '@lvksh/logger';
import EventEmitter from 'node:events';
import fs, { PathLike, promises as fsp, Stats } from 'node:fs';
import path from 'node:path';

import { logMethods } from '../config';
import { Handler } from './Handler';

export class ArchiveHandler extends Handler {
    private static readonly TARGET_FOLDER = 'Archives';

    private readonly log: Logger<string>;
    private readonly targetDirectory: string;
    private readonly statisticsEmitter: EventEmitter;

    public name: string = ArchiveHandler.name;

    constructor(private readonly sourcePath: string) {
        super();

        this.log = createLogger(
            logMethods,
            { padding: 'PREPEND' },
            console.log
        );

        this.statisticsEmitter = new EventEmitter();

        this.targetDirectory = path.join(
            sourcePath,
            ArchiveHandler.TARGET_FOLDER
        );

        if (!fs.existsSync(this.targetDirectory)) {
            fs.mkdirSync(this.targetDirectory);
        }
    }

    static create(sourcePath: string): Handler {
        return new ArchiveHandler(sourcePath);
    }

    async getSupportedFileTypes(): Promise<string[]> {
        return ['7z', 'zip', 'rar', 'tar', 'bz2', 'bzip2'];
    }

    async handle(
        fullFilePath: string,
        extension: string,
        fileStats: Stats,
        fileHash: string
    ): Promise<void> {
        this.log.info(
            `[${ArchiveHandler.name}] Handling file: ${fullFilePath}`
        );

        const fileName = fullFilePath.slice(
            fullFilePath.lastIndexOf(path.sep) + 1,
            fullFilePath.lastIndexOf('.')
        );

        await fsp.copyFile(
            fullFilePath,
            path.join(this.targetDirectory, `${fileName}.${extension}`)
        );
        await fsp.unlink(fullFilePath);
        this.statisticsEmitter.emit('file_handle');
    }
}
