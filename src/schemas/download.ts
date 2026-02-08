export const infoSchema = {
    description: 'Get information about a media URL or playlist',
    tags: ['download'],
    body: {
        type: 'object',
        required: ['url'],
        properties: {
            url: { type: 'string' },
            cookies: {
                anyOf: [
                    { type: 'array' },
                    { type: 'string' }
                ]
            }
        }
    },
    response: {
        200: {
            type: 'array',
            items: {
                type: 'object',
                additionalProperties: true,
                properties: {
                    title: { type: 'string' },
                    artists: { type: 'array', items: { type: 'string' } },
                    coverUrl: { type: 'string' },
                    source: { type: 'string' },
                    url: { type: 'string' }
                }
            }
        }
    }
};

export const downloadSchema = {
    description: 'Queue media downloads in bulk',
    tags: ['download'],
    body: {
        type: 'object',
        required: ['tracks'],
        properties: {
            tracks: {
                type: 'array',
                items: {
                    type: 'object',
                    required: ['url'],
                    properties: {
                        url: { type: 'string' },
                        title: { type: 'string' },
                        artists: {
                            anyOf: [
                                { type: 'array', items: { type: 'string' } },
                                { type: 'string' }
                            ]
                        }
                    }
                }
            },
            cookies: {
                anyOf: [
                    { type: 'array' },
                    { type: 'string' }
                ]
            },
            audioSubPath: { type: 'string' },
            coverSubPath: { type: 'string' }
        }
    },
    response: {
        202: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                message: { type: 'string' },
                count: { type: 'number' },
                jobs: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            url: { type: 'string' },
                            jobId: { type: 'string' }
                        }
                    }
                }
            }
        }
    }
};
export const streamSchema = {
    description: 'Stream a media download directly to the browser',
    tags: ['download'],
    body: {
        type: 'object',
        required: ['url'],
        properties: {
            url: { type: 'string' },
            title: { type: 'string' },
            artists: {
                anyOf: [
                    { type: 'array', items: { type: 'string' } },
                    { type: 'string' }
                ]
            },
            cookies: {
                anyOf: [
                    { type: 'array' },
                    { type: 'string' }
                ]
            }
        }
    },
    response: {
        200: {
            description: 'Audio stream',
            type: 'string',
            format: 'binary'
        }
    }
};
