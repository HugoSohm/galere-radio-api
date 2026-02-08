import fs from 'fs';
import path from 'path';

/**
 * Lists files in a directory non-recursively.
 * @param dir The full path to the directory to list.
 * @param subPath The relative path from the base directory (optional).
 */
export const getFiles = (dir: string, subPath?: string): { name: string, relativePath: string }[] => {
    if (!fs.existsSync(dir)) return [];
    const list = fs.readdirSync(dir);
    return list
        .filter(f => !fs.statSync(path.join(dir, f)).isDirectory())
        .map(f => ({
            name: f,
            relativePath: subPath ? path.join(subPath, f) : f
        }));
};
