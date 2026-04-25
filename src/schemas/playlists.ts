export const getPlaylistsSchema = {
    summary: 'List playlists',
    description: 'Retrieves all playlists based on existing folders.',
    tags: ['playlists'],
    response: {
        200: {
            type: 'array',
            items: {
                type: 'string'
            }
        }
    }
};

export const createPlaylistSchema = {
    summary: 'Create playlist',
    description: 'Creates a new playlist folder.',
    tags: ['playlists'],
    body: {
        type: 'object',
        required: ['name'],
        properties: {
            name: { type: 'string', description: 'Playlist name in kebab-case' }
        }
    },
    response: {
        200: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                message: { type: 'string' },
                playlist: { type: 'string' }
            }
        },
        400: {
            type: 'object',
            properties: { error: { type: 'string' } }
        }
    }
};

export const updatePlaylistSchema = {
    summary: 'Rename playlist',
    description: 'Renames an existing playlist folder.',
    tags: ['playlists'],
    params: {
        type: 'object',
        required: ['name'],
        properties: {
            name: { type: 'string', description: 'Current playlist name' }
        }
    },
    body: {
        type: 'object',
        required: ['newName'],
        properties: {
            newName: { type: 'string', description: 'New playlist name in kebab-case' }
        }
    },
    response: {
        200: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                message: { type: 'string' },
                playlist: { type: 'string' }
            }
        },
        400: {
            type: 'object',
            properties: { error: { type: 'string' } }
        },
        404: {
            type: 'object',
            properties: { error: { type: 'string' } }
        }
    }
};

export const deletePlaylistSchema = {
    summary: 'Delete playlist',
    description: 'Deletes a playlist folder and its contents.',
    tags: ['playlists'],
    params: {
        type: 'object',
        required: ['name'],
        properties: {
            name: { type: 'string', description: 'Playlist name' }
        }
    },
    response: {
        200: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                message: { type: 'string' }
            }
        },
        400: {
            type: 'object',
            properties: { error: { type: 'string' } }
        },
        404: {
            type: 'object',
            properties: { error: { type: 'string' } }
        }
    }
};
