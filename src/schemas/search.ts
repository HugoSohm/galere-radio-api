export const searchSchema = {
    summary: 'Search tracks',
    description: 'Search for tracks on YouTube',
    tags: ['search'],
    body: {
        type: 'object',
        properties: {
            artist: { type: 'string', description: 'Artist name' },
            title: { type: 'string', description: 'Track title' },
            cookies: {
                anyOf: [
                    { type: 'array' },
                    { type: 'string' }
                ]
            },
            limit: { type: 'integer', default: 5, description: 'Number of results (max 10)' }
        }
    },
    response: {
        200: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    title: { type: 'string' },
                    artists: { type: 'array', items: { type: 'string' } },
                    coverUrl: { type: 'string' },
                    url: { type: 'string' },
                    source: { type: 'string' }
                }
            }
        }
    }
};

export const searchCoverSchema = {
    summary: 'Search cover for ID',
    description: 'Searches for a cover image across Spotify, SoundCloud, and YouTube for a given track ID.',
    tags: ['search'],
    querystring: {
        type: 'object',
        properties: {
            artists: { type: 'array', items: { type: 'string' }, description: 'Artists names' },
            title: { type: 'string', description: 'Track title' },
            id: { type: 'string', description: 'Optional track ID' }
        },
        anyOf: [
            { required: ['id'] },
            { required: ['artists', 'title'] }
        ]
    },
    response: {
        200: {
            type: 'object',
            properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                artists: { type: 'array', items: { type: 'string' } },
                coverUrl: { type: 'string' },
                source: { type: 'string' }
            }
        },
        404: {
            type: 'object',
            properties: {
                error: { type: 'string' }
            }
        }
    }
};
