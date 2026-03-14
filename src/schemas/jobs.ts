const jobProperties = {
    id: { type: 'string' },
    status: { type: 'string' },
    progress: { type: 'number' },
    result: {
        type: 'object',
        nullable: true,
        properties: {
            audioPath: { type: 'string' },
            coverPath: { type: 'string' },
            metadata: {
                type: 'object',
                properties: {
                    title: { type: 'string' },
                    artists: { type: 'array', items: { type: 'string' } },
                    coverUrl: { type: 'string' },
                    source: { type: 'string' }
                }
            }
        }
    },
    error: { type: 'string', nullable: true }
};

export const jobStatusSchema = {
    description: 'Get status of a download job or list all jobs',
    tags: ['jobs'],
    querystring: {
        type: 'object',
        properties: {
            id: { type: 'string', description: 'The job ID (optional)' }
        }
    },
    response: {
        200: {
            oneOf: [
                {
                    type: 'object',
                    properties: jobProperties
                },
                {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: jobProperties
                    }
                }
            ]
        }
    }
};
