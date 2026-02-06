export const infoSchema = {
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
    }
};

export const downloadSchema = {
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
    }
};
