/**
 * Sanitizes a string for use as a filename.
 */
export const sanitizeFilename = (str: string): string => {
    return str.replace(/[^a-z0-9\u00C0-\u024F\s,-]/gi, '').trim();
};
