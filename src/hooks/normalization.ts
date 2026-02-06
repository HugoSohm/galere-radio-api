import { FastifyReply, FastifyRequest } from "fastify";
import { getBodyFieldValue } from "../utils/helpers";

export const normalizationHook = async (request: FastifyRequest) => {
    if (request.body === undefined || request.body === null) {
        request.body = {};
    }

    if (typeof request.body !== 'object') return;

    const body = request.body as Record<string, any>;
    const normalizedBody: Record<string, any> = {};

    // 1. Un-wrap multipart fields and basic fields
    for (const key of Object.keys(body)) {
        normalizedBody[key] = getBodyFieldValue(body[key]);
    }

    // 2. Parse complex fields if they are strings (JSON or comma separated)

    // Handle Cookies
    if (typeof normalizedBody.cookies === 'string' && normalizedBody.cookies.trim() !== '') {
        try {
            normalizedBody.cookies = JSON.parse(normalizedBody.cookies);
        } catch (e) {
            // If not valid JSON, we leave it as string and schema/handler will handle it
        }
    }

    // Handle Artists
    if (typeof normalizedBody.artists === 'string' && normalizedBody.artists.trim() !== '') {
        try {
            const parsed = JSON.parse(normalizedBody.artists);
            if (Array.isArray(parsed)) {
                normalizedBody.artists = parsed;
            } else {
                normalizedBody.artists = [normalizedBody.artists];
            }
        } catch (e) {
            if (normalizedBody.artists.includes(',')) {
                normalizedBody.artists = normalizedBody.artists.split(',').map((s: string) => s.trim());
            } else {
                normalizedBody.artists = [normalizedBody.artists.trim()];
            }
        }
    } else if (Array.isArray(normalizedBody.artists)) {
        // Un-wrap potential multipart values inside array
        normalizedBody.artists = normalizedBody.artists.map((a: any) => getBodyFieldValue(a));
    }

    request.body = normalizedBody;
};
