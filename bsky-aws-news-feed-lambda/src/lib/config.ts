import { z } from "zod";
import { env } from "node:process";
import type { AtpAgentLoginOpts } from "@atproto/api";
import { getSecret } from '@aws-lambda-powertools/parameters/secrets';

const secretsSchema = z.object({
    handle: z.string().min(1),
    password: z.string().min(1),
    service: z.string().min(1).default("https://bsky.social"),
});

const secrets = secretsSchema.parse(JSON.parse(await getSecret('bsky_awsnews_secrets') ?? ''));

export const bskyAccount: AtpAgentLoginOpts = {
    identifier: secrets.handle,
    password: secrets.password,
};

const envSchema = z.object({
    BSKY_DRY_RUN: z.enum(['true', 'false']).transform((value) => value === 'true')
});

const envVars = envSchema.parse(env);

export const bskyService = secrets.service;
export const bskyDryRun = envVars.BSKY_DRY_RUN
