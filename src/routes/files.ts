import { FastifyInstance, FastifyPluginOptions } from "fastify";
import fs from "fs";
import path from "path";
import { getFiles } from "../utils/files";
import { parseFile } from "music-metadata";
import { sanitizeFilename } from "../utils/string";

const MP3_DIR = path.resolve(process.env.MP3_DOWNLOAD_DIR ?? 'mp3');
const COVER_DIR = path.resolve(process.env.COVER_DOWNLOAD_DIR ?? 'cover');

export default async function filesRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
    fastify.get<{ Querystring: { subPath?: string, audioSubPath?: string, coverSubPath?: string } }>("/files", async (request, reply) => {
        const { subPath, audioSubPath, coverSubPath } = request.query;

        const checkValue = (val?: string) => val && (val.includes("..") || val.startsWith("/") || val.startsWith("\\"));
        if (checkValue(subPath) || checkValue(audioSubPath) || checkValue(coverSubPath)) {
            return reply.status(400).send({ error: "Invalid subPath" });
        }

        const targetAudioSubPath = audioSubPath || subPath || "";
        const targetCoverSubPath = coverSubPath || subPath || "";

        const audioExtensions = [".mp3", ".wav", ".m4a", ".ogg", ".flac", ".aac"];
        const audioFiles = getFiles(path.join(MP3_DIR, targetAudioSubPath), targetAudioSubPath);
        const coverFiles = getFiles(path.join(COVER_DIR, targetCoverSubPath), targetCoverSubPath);

        const fileMap = new Map<string, { id: string, audio?: any, cover?: any }>();
        const PORT = process.env.PORT || 3000;
        const rawBaseUrl = process.env.BASE_URL || `${request.protocol}://${request.hostname}:${PORT}`;
        const baseUrl = rawBaseUrl.endsWith('/') ? rawBaseUrl.slice(0, -1) : rawBaseUrl;

        for (const fileObj of audioFiles) {
            const { name: file, relativePath } = fileObj;
            const fullPath = path.join(MP3_DIR, relativePath);
            const parsed = path.parse(relativePath);
            const ext = parsed.ext.toLowerCase();

            if (audioExtensions.includes(ext)) {
                let id = parsed.name; // Fallback to filename
                try {
                    const metadata = await parseFile(fullPath);
                    if (metadata.common.title) {
                        const artists = metadata.common.artist || metadata.common.artists?.join(", ") || "Unknown Artist";
                        id = sanitizeFilename(`${metadata.common.title}-${artists}`);
                    }
                } catch (err) {
                    fastify.log.warn(`Failed to read metadata for ${file}: ${err}`);
                }

                const mapKey = id;
                const webPath = `/mp3/${relativePath.replace(/\\/g, '/')}`;

                fileMap.set(mapKey, {
                    id,
                    audio: {
                        name: file,
                        path: webPath,
                        url: `${baseUrl}${webPath}`
                    }
                });
            }
        }

        for (const fileObj of coverFiles) {
            const { name: file, relativePath } = fileObj;
            const parsed = path.parse(relativePath);
            const id = parsed.name;
            const ext = parsed.ext.toLowerCase();
            const mapKey = id;
            const webPath = `/cover/${relativePath.replace(/\\/g, '/')}`;

            if ([".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext)) {
                const entry = fileMap.get(mapKey) || { id };
                entry.cover = {
                    name: file,
                    path: webPath,
                    url: `${baseUrl}${webPath}`
                };
                fileMap.set(mapKey, entry);
            }
        }

        return Array.from(fileMap.values());
    });

    // DELETE /files - Delete based on query parameters
    fastify.delete<{ Querystring: { id?: string, type?: string, filename?: string, subPath?: string, audioSubPath?: string, coverSubPath?: string } }>("/files", async (request, reply) => {
        const { id, type, filename, subPath, audioSubPath, coverSubPath } = request.query;

        // Security check for id, filename, or subPaths
        const targetName = id || filename;
        const checkValue = (val?: string) => val && (val.includes("..") || val.startsWith("/") || val.startsWith("\\"));

        if (checkValue(targetName) || checkValue(subPath) || checkValue(audioSubPath) || checkValue(coverSubPath)) {
            return reply.status(400).send({ error: "Invalid ID, filename or subPath" });
        }

        // Case 1: Delete paired files (id + optional subPath)
        if (id) {
            const deleted = [];
            const errors = [];

            const targetAudioSubPath = audioSubPath || subPath || "";
            const targetCoverSubPath = coverSubPath || subPath || "";

            // Try delete Audio files
            const audioExtensions = [".mp3", ".wav", ".m4a", ".ogg", ".flac", ".aac"];
            const targetAudioDir = path.join(MP3_DIR, targetAudioSubPath);
            if (fs.existsSync(targetAudioDir)) {
                const files = fs.readdirSync(targetAudioDir);
                for (const file of files) {
                    const fullPath = path.join(targetAudioDir, file);
                    const parsed = path.parse(file);
                    const ext = parsed.ext.toLowerCase();

                    if (audioExtensions.includes(ext)) {
                        let match = false;
                        if (parsed.name === id) {
                            match = true;
                        } else {
                            // Smart match via ID3
                            try {
                                const metadata = await parseFile(fullPath);
                                if (metadata.common.title) {
                                    const artists = metadata.common.artist || metadata.common.artists?.join(", ") || "Unknown Artist";
                                    const metadataId = sanitizeFilename(`${metadata.common.title}-${artists}`);
                                    if (metadataId === id) {
                                        match = true;
                                    }
                                }
                            } catch (e) {
                                // Ignore metadata read errors during delete scan
                            }
                        }

                        if (match) {
                            try {
                                fs.unlinkSync(fullPath);
                                deleted.push(targetAudioSubPath ? path.join(targetAudioSubPath, file) : file);
                            } catch (err) {
                                errors.push(`Failed to delete audio: ${file}`);
                            }
                        }
                    }
                }
            }

            // Try delete Cover
            const targetCoverDir = path.join(COVER_DIR, targetCoverSubPath);
            if (fs.existsSync(targetCoverDir)) {
                // For covers, we stick to filename-based matching as requested ("title of the png which is always title-artist")
                const covers = fs.readdirSync(targetCoverDir).filter(f => path.parse(f).name === id);
                for (const cover of covers) {
                    const coverPath = path.join(targetCoverDir, cover);
                    try {
                        fs.unlinkSync(coverPath);
                        deleted.push(targetCoverSubPath ? path.join(targetCoverSubPath, cover) : cover);
                    } catch (err) {
                        errors.push(`Failed to delete cover: ${cover}`);
                    }
                }
            }

            if (deleted.length === 0 && errors.length === 0) {
                return reply.status(404).send({ error: "No files found with this ID" });
            }

            return { success: true, deleted, errors: errors.length > 0 ? errors : undefined };
        }

        // Case 2: Delete specific file (type + filename + optional subPath)
        if (type && filename) {
            let baseDir: string;
            let targetSub: string;

            if (type === "mp3" || type === "audio") {
                baseDir = MP3_DIR;
                targetSub = audioSubPath || subPath || "";
            } else if (type === "cover") {
                baseDir = COVER_DIR;
                targetSub = coverSubPath || subPath || "";
            } else {
                return reply.status(400).send({ error: "Invalid type. Must be 'audio', 'mp3', or 'cover'" });
            }

            const filePath = path.join(baseDir, targetSub, filename);
            if (!fs.existsSync(filePath)) {
                return reply.status(404).send({ error: "File not found" });
            }

            try {
                fs.unlinkSync(filePath);
                return { success: true, message: `File ${filename} deleted from ${type}${targetSub ? ` in ${targetSub}` : ""}` };
            } catch (err) {
                fastify.log.error(err);
                return reply.status(500).send({ error: "Failed to delete file" });
            }
        }

        return reply.status(400).send({ error: "Missing required parameters (id OR type + filename)" });
    });
}
