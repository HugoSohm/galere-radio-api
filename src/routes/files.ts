import { FastifyInstance, FastifyPluginOptions } from "fastify";
import fs from "fs";
import path from "path";
import { getFiles } from "../utils/files";

const MP3_DIR = path.resolve(process.env.MP3_DOWNLOAD_DIR ?? 'mp3');
const COVER_DIR = path.resolve(process.env.COVER_DOWNLOAD_DIR ?? 'cover');

export default async function filesRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
    fastify.get<{ Querystring: { subPath?: string } }>("/files", async (request, reply) => {
        const { subPath } = request.query;

        if (subPath && (subPath.includes("..") || subPath.startsWith("/") || subPath.startsWith("\\"))) {
            return reply.status(400).send({ error: "Invalid subPath" });
        }

        const targetSubPath = subPath || "";
        const mp3Files = getFiles(path.join(MP3_DIR, targetSubPath), subPath);
        const coverFiles = getFiles(path.join(COVER_DIR, targetSubPath), subPath);

        const fileMap = new Map<string, { id: string, mp3?: any, cover?: any }>();
        const PORT = process.env.PORT || 3000;
        const rawBaseUrl = process.env.BASE_URL || `${request.protocol}://${request.hostname}:${PORT}`;
        const baseUrl = rawBaseUrl.endsWith('/') ? rawBaseUrl.slice(0, -1) : rawBaseUrl;

        for (const fileObj of mp3Files) {
            const { name: file, relativePath } = fileObj;
            if (file.endsWith(".mp3")) {
                const parsed = path.parse(relativePath);
                const id = parsed.name;
                const mapKey = relativePath.replace(".mp3", "");
                const webPath = `/mp3/${relativePath.replace(/\\/g, '/')}`;

                fileMap.set(mapKey, {
                    id,
                    mp3: {
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
            const mapKey = relativePath.replace(ext, "");
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
    fastify.delete<{ Querystring: { id?: string, type?: string, filename?: string, subPath?: string } }>("/files", async (request, reply) => {
        const { id, type, filename, subPath } = request.query;

        // Security check for id, filename, or subPath
        const targetName = id || filename;
        const checkValue = (val?: string) => val && (val.includes("..") || val.startsWith("/") || val.startsWith("\\"));

        if (checkValue(targetName) || checkValue(subPath)) {
            return reply.status(400).send({ error: "Invalid ID, filename or subPath" });
        }

        // Case 1: Delete paired files (id + optional subPath)
        if (id) {
            const deleted = [];
            const errors = [];

            const targetSubPath = subPath || "";

            // Try delete MP3
            const mp3Path = path.join(MP3_DIR, targetSubPath, `${id}.mp3`);
            if (fs.existsSync(mp3Path)) {
                try {
                    fs.unlinkSync(mp3Path);
                    deleted.push(subPath ? path.join(subPath, `${id}.mp3`) : `${id}.mp3`);
                } catch (err) {
                    errors.push(`Failed to delete MP3: ${id}.mp3`);
                }
            }

            // Try delete Cover
            const targetCoverDir = path.join(COVER_DIR, targetSubPath);
            if (fs.existsSync(targetCoverDir)) {
                const covers = fs.readdirSync(targetCoverDir).filter(f => path.parse(f).name === id);
                for (const cover of covers) {
                    const coverPath = path.join(targetCoverDir, cover);
                    try {
                        fs.unlinkSync(coverPath);
                        deleted.push(subPath ? path.join(subPath, cover) : cover);
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
            if (type === "mp3") {
                baseDir = MP3_DIR;
            } else if (type === "cover") {
                baseDir = COVER_DIR;
            } else {
                return reply.status(400).send({ error: "Invalid type. Must be 'mp3' or 'cover'" });
            }

            const filePath = path.join(baseDir, subPath || "", filename);
            if (!fs.existsSync(filePath)) {
                return reply.status(404).send({ error: "File not found" });
            }

            try {
                fs.unlinkSync(filePath);
                return { success: true, message: `File ${filename} deleted from ${type}${subPath ? ` in ${subPath}` : ""}` };
            } catch (err) {
                fastify.log.error(err);
                return reply.status(500).send({ error: "Failed to delete file" });
            }
        }

        return reply.status(400).send({ error: "Missing required parameters (id OR type + filename)" });
    });
}
