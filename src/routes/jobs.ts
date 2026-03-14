import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { downloadQueue } from "../services/queue";
import { jobStatusSchema } from "../schemas/jobs";

export default async function jobRoutes(app: FastifyInstance) {
    app.get("/jobs", {
        schema: jobStatusSchema
    }, async (request: FastifyRequest<{ Querystring: { id?: string } }>, reply: FastifyReply) => {
        const { id } = request.query;

        const formatJob = async (job: any) => {
            const state = await job.getState();
            const progress = job.progress;
            return {
                id: job.id,
                status: state,
                progress: typeof progress === 'number' ? progress : 0,
                result: job.returnvalue || null,
                error: job.failedReason || null
            };
        };

        if (id) {
            const job = await downloadQueue.getJob(id);

            if (!job) {
                return reply.status(404).send({ error: "Job not found" });
            }

            return reply.send(await formatJob(job));
        } else {
            // List all jobs
            const jobs = await downloadQueue.getJobs(['active', 'waiting', 'delayed', 'completed', 'failed']);
            // Sort by ID descending (newest first) - assuming IDs are timestamp-based or numeric increment
            jobs.sort((a, b) => Number(b.id) - Number(a.id));

            const formattedJobs = await Promise.all(jobs.map(formatJob));
            return reply.send(formattedJobs);
        }
    });
}
