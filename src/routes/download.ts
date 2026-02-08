import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { downloadQueue } from "../utils/queue";
import { downloadSchema, streamSchema } from "../schemas/download";
import { DownloadBody } from "../types/download";

export default async function downloadRoutes(app: FastifyInstance) {
    app.post("/download", {
        schema: downloadSchema
    }, async (request: FastifyRequest<{ Body: DownloadBody }>, reply: FastifyReply) => {
        const { url, title, artists, cookies: cookiesRaw, mp3SubPath, coverSubPath } = request.body;

        try {
            let cookies: any[] | undefined;
            if (cookiesRaw) {
                if (typeof cookiesRaw === 'string') {
                    try {
                        cookies = JSON.parse(cookiesRaw);
                    } catch (e) {
                        return reply.status(400).send({ error: "Invalid cookies format." });
                    }
                } else {
                    cookies = cookiesRaw;
                }
            }

            const parsedArtists = Array.isArray(artists) ? artists : undefined;

            const job = await downloadQueue.add('download', {
                url,
                cookies,
                overrides: {
                    title,
                    artists: parsedArtists && parsedArtists.length > 0 ? parsedArtists : undefined
                },
                mp3SubPath,
                coverSubPath
            });

            return reply.status(202).send({
                success: true,
                jobId: job.id,
                message: "Download queued successfully"
            });
        } catch (error: any) {
            request.log.error(error);
            return reply.status(500).send({ error: "Failed to queue download", details: error.message });
        }
    });

    app.post("/download/stream", {
        schema: streamSchema
    }, async (request: FastifyRequest<{ Body: DownloadBody }>, reply: FastifyReply) => {
        const { url, title, artists, cookies: cookiesRaw } = request.body;

        try {
            let cookies: any[] | undefined;
            if (cookiesRaw) {
                if (typeof cookiesRaw === 'string') {
                    try {
                        cookies = JSON.parse(cookiesRaw);
                    } catch (e) {
                        return reply.status(400).send({ error: "Invalid cookies format." });
                    }
                } else {
                    cookies = cookiesRaw;
                }
            }

            const parsedArtists = Array.isArray(artists) ? artists : undefined;

            const { stream, filename } = await require("../utils/downloader").getMediaStream(url, cookies, {
                title,
                artists: parsedArtists && parsedArtists.length > 0 ? parsedArtists : undefined
            });

            return reply
                .header('Content-Disposition', `attachment; filename="${filename}"`)
                .header('Content-Type', 'audio/mpeg')
                .send(stream);
        } catch (error: any) {
            request.log.error(error);
            return reply.status(500).send({ error: "Failed to initialize stream", details: error.message });
        }
    });
}
