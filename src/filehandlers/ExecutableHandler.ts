import { createLogger, Logger } from '@lvksh/logger';
import fs, { PathLike, Stats } from 'node:fs';
import path from 'node:path';

import { logMethods } from '../config';
import { Handler } from './Handler';

export class ExecutableHandler extends Handler {
    private static readonly TARGET_FOLDER = 'Executables';

    private log: Logger<string>;
    private readonly targetDirectory: string;

    public name: string = ExecutableHandler.name;

    private constructor(private readonly sourcePath: string) {
        super();
        this.log = createLogger(
            logMethods,
            { padding: 'PREPEND' },
            console.log
        );

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
        fullFilePath: PathLike,
        extension: String,
        fileStat: Stats,
        fileHash: string
    ): Promise<void> {
        return undefined;
    }
}
