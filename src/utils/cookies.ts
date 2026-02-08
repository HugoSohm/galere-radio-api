import fs from 'fs';
import path from 'path';

/**
 * Validates the structure of a cookies array.
 */
export const validateCookies = (cookies: any[]): boolean => {
    if (!Array.isArray(cookies)) return false;
    return cookies.every(cookie =>
        cookie &&
        typeof cookie === 'object' &&
        typeof cookie.name === 'string' &&
        typeof cookie.value === 'string'
    );
};

/**
 * Writes cookies to a temporary Netscape-format file for yt-dlp.
 */
export const writeCookiesFile = (cookies: any[]): string => {
    const tempPath = path.join(process.cwd(), `cookies-${Date.now()}.txt`);
    const netscapeCookies = cookies.map(cookie => {
        const domain = cookie.domain || '.youtube.com';
        const flag = domain.startsWith('.') ? 'TRUE' : 'FALSE';
        const path = cookie.path || '/';
        const secure = cookie.secure ? 'TRUE' : 'FALSE';
        const expiration = cookie.expirationDate ? Math.floor(cookie.expirationDate) : 0;
        const name = cookie.name;
        const value = cookie.value;
        return `${domain}\t${flag}\t${path}\t${secure}\t${expiration}\t${name}\t${value}`;
    }).join('\n');

    fs.writeFileSync(tempPath, `# Netscape HTTP Cookie File\n${netscapeCookies}`, 'utf-8');
    return tempPath;
};
