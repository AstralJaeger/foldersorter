import fs, { PathLike, Stats } from 'node:fs';
import path from 'node:path';

import { Handler } from './Handler';

export class ArchiveHandler extends Handler {
    private static readonly TARGET_FOLDER = 'Archives';
    private readonly targetDirectory: string;

    public name: string = ArchiveHandler.name;

    constructor(private readonly sourcePath: string) {
        super();
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
        fullFilePath: PathLike,
        extension: String,
        fileStats: Stats,
        fileHash: string
    ): Promise<void> {
        return undefined;
    }
}
