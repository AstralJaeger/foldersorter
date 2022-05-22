import crypto from 'node:crypto';
import fs from 'node:fs';

export async function hashFile(
    filePath: string,
    algorithm: string = 'sha256',
    encoding: string = 'hex'
): Promise<string> {
    const hash = crypto.createHash(algorithm);

    hash.setEncoding(
        <
            | 'ascii'
            | 'utf8'
            | 'utf16le'
            | 'ucs2'
            | 'ucs-2'
            | 'base64'
            | 'base64url'
            | 'latin1'
            | 'binary'
            | 'hex'
        >encoding
    );

    return new Promise((resolve, _reject) => {
        const input = fs.createReadStream(filePath);

        input.on('end', () => {
            hash.end();
            resolve(hash.read());
        });
        input.pipe(hash);
    });
}
