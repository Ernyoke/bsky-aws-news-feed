import {Logger} from "@aws-lambda-powertools/logger";
import {SendMessageBatchCommand, SendMessageBatchRequestEntry, SQSClient} from "@aws-sdk/client-sqs";
import {config} from "./config.js";
import {Article} from "shared";
import _ from "lodash";

const queueUrl = config.queueUrl;

export default class QueueClient {
    private client: SQSClient;

    constructor(private logger: Logger, private batchSize = 25) {
        this.client = new SQSClient({});
    }

    async sendArticlesWithDelay(articles: Article[], initialDelay = 0) {
        let delay = initialDelay;
        const entries: SendMessageBatchRequestEntry[] = [];

        for (const article of articles) {
            const entry = {
                Id: article.guid,
                MessageBody: JSON.stringify(article),
                DelaySeconds: delay
            } as SendMessageBatchRequestEntry;
            entries.push(entry);

            delay += 30; // add 30 seconds delay for each consecutive message
        }

        const batches = _.chunk(entries, this.batchSize);
        const commands = batches.map(batch => new SendMessageBatchCommand({
            QueueUrl: queueUrl,
            Entries: batch
        }));

        const sendBatchResults =
            await Promise.allSettled(commands.map(command => this.client.send(command)));

        for (const batchResult of sendBatchResults) {
            if (batchResult.status === "fulfilled") {
                if (batchResult.value && batchResult.value.Failed) {
                    for (const failure of batchResult.value.Failed) {
                        this.logger.error(`Failed to send message: ${failure.Id}`);
                    }
                } else {
                    this.logger.info(`Batch with ${batchResult.value} pushed successfully.`);
                }
            } else {
                this.logger.error("Batch request failed!");
            }
        }
    }
}