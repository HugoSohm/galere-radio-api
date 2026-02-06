import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { downloadMedia } from "../utils/downloader";
import { downloadSchema } from "../schemas/download";
import { DownloadBody } from "../types/download";

export default async function downloadRoutes(app: FastifyInstance) {
    app.post("/download", { schema: downloadSchema }, async (request: FastifyRequest<{ Body: DownloadBody }>, reply: FastifyReply) => {
        const { url, title, artists, cookies: cookiesRaw, mp3SubPath, coverSubPath } = request.body;

        try {
            let cookies: any[] | undefined;
            if (cookiesRaw) {
                if (typeof cookiesRaw === 'string') {
                    try {
                        cookies = JSON.parse(cookiesRaw);
                    } catch (e) {
                        return reply.status(400).send({ error: "Invalid cookies format. Must be valid JSON array string." });
                    }
                } else {
                    cookies = cookiesRaw;
                }
            }

            const parsedArtists = Array.isArray(artists) ? artists : undefined;

            const result = await downloadMedia(url, cookies, {
                title: title,
                artists: parsedArtists && parsedArtists.length > 0 ? parsedArtists : undefined
            }, mp3SubPath, coverSubPath);
            return reply.send({
                success: true,
                mp3Path: result.mp3Path,
                coverPath: result.coverPath
            });
        } catch (error: any) {
            request.log.error(error);
            return reply.status(500).send({ error: "Download failed", details: error.message });
        }
    });
}
