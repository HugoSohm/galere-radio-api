import 'dotenv/config';
import Fastify from "fastify";
import healthRoutes from "./routes/health";
import downloadRoutes from "./routes/download";

const app = Fastify({
    logger: true,
});

app.register(healthRoutes);
app.register(downloadRoutes);

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
