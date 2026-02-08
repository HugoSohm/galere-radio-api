import { FastifyInstance, FastifyPluginOptions } from "fastify";
import fs from "fs";
import path from "path";

const MP3_DIR = path.resolve(process.env.MP3_DOWNLOAD_DIR ?? 'mp3');
const COVER_DIR = path.resolve(process.env.COVER_DOWNLOAD_DIR ?? 'cover');

export default async function filesRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {

    // GET /files - List grouped files
    fastify.get("/files", async (request, reply) => {
        const mp3Files = fs.existsSync(MP3_DIR) ? fs.readdirSync(MP3_DIR) : [];
        const coverFiles = fs.existsSync(COVER_DIR) ? fs.readdirSync(COVER_DIR) : [];

        const fileMap = new Map<string, { id: string, mp3?: any, cover?: any }>();

        // Process MP3s
        for (const file of mp3Files) {
            if (file.endsWith(".mp3")) {
                const id = path.parse(file).name;
                fileMap.set(id, {
                    id,
                    mp3: {
                        name: file,
                        path: `/mp3/${file}`
                    }
                });
            }
        }

        // Process Covers (support multiple extensions)
        for (const file of coverFiles) {
            const parsed = path.parse(file);
            const id = parsed.name;
            const ext = parsed.ext.toLowerCase();

            // Basic check for image extensions
            if ([".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext)) {
                const entry = fileMap.get(id) || { id };
                entry.cover = {
                    name: file,
                    path: `/cover/${file}`
                };
                fileMap.set(id, entry);
            }
        }

        return Array.from(fileMap.values());
    });

    // DELETE /files - Delete based on query parameters
    fastify.delete<{ Querystring: { id?: string, type?: string, filename?: string } }>("/files", async (request, reply) => {
        const { id, type, filename } = request.query;

        // Security check for id or filename
        const targetName = id || filename;
        if (targetName && (targetName.includes("/") || targetName.includes("\\") || targetName.includes(".."))) {
            return reply.status(400).send({ error: "Invalid ID or filename" });
        }

        // Case 1: Delete paired files (id)
        if (id) {
            const deleted = [];
            const errors = [];

            // Try delete MP3
            const mp3Path = path.join(MP3_DIR, `${id}.mp3`);
            if (fs.existsSync(mp3Path)) {
                try {
                    fs.unlinkSync(mp3Path);
                    deleted.push(`${id}.mp3`);
                } catch (err) {
                    errors.push(`Failed to delete MP3: ${id}.mp3`);
                }
            }

            // Try delete Cover
            if (fs.existsSync(COVER_DIR)) {
                const covers = fs.readdirSync(COVER_DIR).filter(f => path.parse(f).name === id);
                for (const cover of covers) {
                    const coverPath = path.join(COVER_DIR, cover);
                    try {
                        fs.unlinkSync(coverPath);
                        deleted.push(cover);
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

        // Case 2: Delete specific file (type + filename)
        if (type && filename) {
            let dir: string;
            if (type === "mp3") {
                dir = MP3_DIR;
            } else if (type === "cover") {
                dir = COVER_DIR;
            } else {
                return reply.status(400).send({ error: "Invalid type. Must be 'mp3' or 'cover'" });
            }

            const filePath = path.join(dir, filename);
            if (!fs.existsSync(filePath)) {
                return reply.status(404).send({ error: "File not found" });
            }

            try {
                fs.unlinkSync(filePath);
                return { success: true, message: `File ${filename} deleted from ${type}` };
            } catch (err) {
                fastify.log.error(err);
                return reply.status(500).send({ error: "Failed to delete file" });
            }
        }

        return reply.status(400).send({ error: "Missing required parameters (id OR type + filename)" });
    });
}
