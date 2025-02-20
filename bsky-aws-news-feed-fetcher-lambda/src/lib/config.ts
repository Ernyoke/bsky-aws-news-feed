import {z} from "zod";
import {env} from "node:process";

const envSchema = z.object({
    TABLE_NAME: z.string().min(1),
    QUEUE_URL: z.string().min(1),
});

const envVars = envSchema.parse(env);

export const config = {
    tableName:  envVars.TABLE_NAME,
    queueUrl: envVars.QUEUE_URL,
};
