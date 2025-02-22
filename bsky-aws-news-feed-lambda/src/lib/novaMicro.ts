import {dedent} from "ts-dedent";
import {PromptTemplate} from "@langchain/core/prompts";
import {ChatBedrockConverse} from "@langchain/aws";
import {config} from "./config.js";
import {Logger} from "@aws-lambda-powertools/logger";
import {StringOutputParser} from "@langchain/core/output_parsers";

export class NovaMicro {
    summaryTemplate = dedent`
    You are an AWS expert whose job is to summarize AWS news. You should provide short and concise summary
    for the following news content.
    Important! Your answer should contain maximum 2 sentences!
    ---------
    Title: {title}
    Content: {content}
    ---------
    `;

    private model = new ChatBedrockConverse({
        model: config.novaMicroModelId,
        region: config.awsRegion,
        temperature: 0.5
    });

    constructor(private logger: Logger) {
    }

    async summarize(title: string, content: string) {
        const summaryChain = PromptTemplate.fromTemplate(this.summaryTemplate)
            .pipe(this.model)
            .pipe(new StringOutputParser())

        return await summaryChain.invoke({
            title: title,
            content: content
        });
    }
}