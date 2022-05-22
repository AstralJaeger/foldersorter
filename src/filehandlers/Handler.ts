import { PathLike, Stats } from 'node:fs';

/**
 * An abstract handler to unify other handler types.
 */
export abstract class Handler {

    public name: string = "Handler";

    /**
     * This methods returns a new handler
     * @returns Handler
     */
    static create = (sourceDirectory: string): Handler => {
        throw new Error('Not implemented');
    };

    /**
     * all supported file formats for the handler to register it.
     * @returns string[]
     */
    abstract getSupportedFileTypes(): Promise<string[]>;

    /**
     * Handlers supported files
     * @param fullFilePath the fully qualified file path
     * @param extension the file extension
     * @param fileStat
     * @param fileHash the hashvalue of the file (expensive to calculate)
     */
    abstract handle(
        fullFilePath: PathLike,
        extension: String,
        fileStat: Stats,
        fileHash: string
    ): Promise<void>;
}

export function fileSizeInMB(value: number): number {
    return value / (1024 * 1024);
}
