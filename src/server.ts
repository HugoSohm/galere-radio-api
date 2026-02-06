import 'dotenv/config';
import Fastify from "fastify";
import healthRoutes from "./routes/health";
import infoRoutes from "./routes/info";
import downloadRoutes from "./routes/download";
import formbody from '@fastify/formbody';
import multipart from '@fastify/multipart';
import { normalizationHook } from './hooks/normalization';
import { errorHandler } from './handlers/errorHandler';

const app = Fastify({
    logger: true,
});

app.register(formbody);
app.register(multipart, { attachFieldsToBody: true });

// Global normalization hook
app.addHook('preValidation', normalizationHook);

app.register(healthRoutes);
app.register(infoRoutes);
app.register(downloadRoutes);

app.setErrorHandler(errorHandler);

const PORT = Number(process.env.PORT) || 3000;

const start = async () => {
    try {
        await app.listen({ port: PORT, host: "0.0.0.0" });
        console.log(`🚀 Server running on http://localhost:${PORT}`);
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};

start();
