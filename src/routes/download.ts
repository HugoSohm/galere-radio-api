import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { downloadMedia, getTrackInfo } from "../utils/downloader";

interface DownloadQuery {
    url?: string;
    title?: string;
    artists?: string; // Comma separated for query
    cookies?: string; // JSON string of cookies array
}

export default async function downloadRoutes(app: FastifyInstance) {
    app.get("/info", async (request: FastifyRequest<{ Querystring: DownloadQuery }>, reply: FastifyReply) => {
        const url = request.query.url;
        if (!url) return reply.status(400).send({ error: "Missing 'url' query parameter" });

        try {
            let cookies: any[] | undefined;
            if (request.query.cookies) {
                try {
                    cookies = JSON.parse(request.query.cookies);
                } catch (e) {
                    return reply.status(400).send({ error: "Invalid cookies format. Must be valid JSON array." });
                }
            }
            const { title, artists, coverUrl } = await getTrackInfo(url, cookies);
            return reply.send({ title, artists, coverUrl });
        } catch (error: any) {
            request.log.error(error);
            return reply.status(500).send({ error: "Failed to get info", details: error.message });
        }
    });

    app.get("/download", async (request: FastifyRequest<{ Querystring: DownloadQuery }>, reply: FastifyReply) => {
        const url = request.query.url;
        if (!url) {
            return reply.status(400).send({ error: "Missing 'url' query parameter" });
        }

        // Handle artists strictly
        let parsedArtists: string[] = [];
        if (request.query.artists) {
            parsedArtists = request.query.artists.split(',').map(s => s.trim());
        }

        try {
            let cookies: any[] | undefined;
            if (request.query.cookies) {
                try {
                    cookies = JSON.parse(request.query.cookies);
                } catch (e) {
                    return reply.status(400).send({ error: "Invalid cookies format. Must be valid JSON array." });
                }
            }


            const result = await downloadMedia(url, cookies, {
                title: request.query.title,
                artists: parsedArtists.length > 0 ? parsedArtists : undefined
            });
            return reply.send({
                success: true,
                message: "Download completed",
                data: result
            });
        } catch (error: any) {
            request.log.error(error);
            return reply.status(500).send({ error: "Download failed", details: error.message });
        }
    });
}
