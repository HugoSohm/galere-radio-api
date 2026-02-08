/**
 * Sanitizes a string for use as a filename.
 */
/**
 * Sanitizes a string for use as a filename by removing only strictly forbidden characters.
 * OS-aware: permissive on Linux, restrictive on Windows.
 */
export const sanitizeFilename = (str: string): string => {
    const isWindows = process.platform === 'win32';
    // Linux forbidden: / (and NULL)
    // Windows forbidden: < > : " / \ | ? *
    const forbidden = isWindows ? /[<>:"\/\\|?*]/g : /[\/]/g;
    return str.replace(forbidden, '').trim();
};

/**
 * Normalizes a string for fuzzy pairing (e.g. matching ID3 tags with sanitized filenames).
 * Removes all non-alphanumeric characters and converts to lowercase.
 */
export const normalizeForPairing = (str: string): string => {
    return str.toLowerCase().replace(/[^a-z0-9]/gi, '');
};
