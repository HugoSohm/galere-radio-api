/**
 * Sanitizes a string for use as a filename.
 */
/**
 * Sanitizes a string for use as a filename by keeping only safe printable characters.
 * Removes accents, special symbols, and anything that might break Icecast.
 */
export const sanitizeFilename = (str: string): string => {
    return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents/diacritics
        .replace(/[^a-zA-Z0-9\s\-_]/g, '') // Keep only alphanumeric, space, dash, underscore
        .replace(/\s+/g, ' ') // Collapse multiple spaces
        .trim();
};

/**
 * Normalizes a string for fuzzy pairing (e.g. matching ID3 tags with sanitized filenames).
 * Removes all non-alphanumeric characters and converts to lowercase.
 */
export const normalizeForPairing = (str: string): string => {
    return str
        .normalize('NFD') // Decompose accents to base letter + diacritic
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritic marks
        .toLowerCase()
        .replace(/[^a-z0-9]/g, ''); // Remove everything not alphanumeric
};
