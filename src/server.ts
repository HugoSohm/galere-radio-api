import 'dotenv/config';
import Fastify from "fastify";
import healthRoutes from "./routes/health";
import downloadRoutes from "./routes/download";

const app = Fastify({
    logger: true,
});

app.register(healthRoutes);
app.register(downloadRoutes);

const start = async () => {
    try {
        await app.listen({ port: 3000, host: "0.0.0.0" });
        console.log("🚀 Server running on http://localhost:3000");
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};

start();
