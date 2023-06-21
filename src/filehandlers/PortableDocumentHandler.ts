import { createLogger, Logger } from '@lvksh/logger';
import fs, { promises as fsp, Stats } from 'node:fs';
import path from 'node:path';

import { logMethods } from '../config';
import { Handler } from './Handler';

export class PortableDocumentHandler extends Handler {
    private static readonly TARGET_FOLDER = 'Documents';

    private readonly log: Logger<string>;
    private readonly targetDirectory: string;
    private readonly statisticsEmitter: EventTarget;

    public name: string = PortableDocumentHandler.name;

    constructor(private readonly sourcePath: string) {
        super();

        this.log = createLogger(
            logMethods,
            { padding: 'PREPEND' },
            console.log
        );

        this.statisticsEmitter = new EventTarget();

        this.targetDirectory = path.join(
            sourcePath,
            PortableDocumentHandler.TARGET_FOLDER
        );

        if (!fs.existsSync(this.targetDirectory)) {
            fs.mkdirSync(this.targetDirectory);
        }
    }

    static create(sourcePath: string): Handler {
        return new PortableDocumentHandler(sourcePath);
    }

    async getSupportedFileTypes(): Promise<string[]> {
        return ['pdf'];
    }

    async handle(
        fullFilePath: string,
        extension: string,
        _fileStats: Stats,
        _fileHash: string
    ): Promise<void> {
        this.log.info(
            `[${PortableDocumentHandler.name}] Handling file: ${fullFilePath}`
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
        this.statisticsEmitter.dispatchEvent(new Event('file_handle'));
    }
}
