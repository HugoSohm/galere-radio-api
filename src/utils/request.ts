/**
 * Utility to extract the actual value from a Fastify body field (handling multipart wrapping).
 */
export const getBodyFieldValue = (field: any): any => {
    if (field && typeof field === 'object' && 'value' in field) {
        return field.value;
    }
    return field;
};
