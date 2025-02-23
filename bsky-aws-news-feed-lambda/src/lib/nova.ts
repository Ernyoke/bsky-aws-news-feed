import {dedent} from "ts-dedent";
import {PromptTemplate} from "@langchain/core/prompts";
import {ChatBedrockConverse} from "@langchain/aws";
import {config} from "./config.js";
import {Logger} from "@aws-lambda-powertools/logger";
import {StringOutputParser} from "@langchain/core/output_parsers";

export class Nova {
    private model = new ChatBedrockConverse({
        model: config.novaModelId,
        region: config.awsRegion,
        temperature: 0.3
    });

    constructor(private logger: Logger) {
    }

    async summarize(title: string, content: string) {
        const summaryTemplate = dedent`
        You are an AWS expert whose job is to summarize AWS news. You should provide short and concise summary
        for the following news content.
        IMPORTANT! Limit your response to exactly 250 characters or fewer. If you exceed this limit, trim the response.
        ---------
        Title: {title}
        Content: {content}
        `;

        const summaryChain = PromptTemplate.fromTemplate(summaryTemplate)
            .pipe(this.model)
            .pipe(new StringOutputParser());

        return await summaryChain.invoke({
            title: title,
            content: content
        });
    }

    async shortenSummary(summary: string, maxCharacters: number) {
        const summaryTemplate = dedent`Shorten this summary to under {maxCharacters} 
        graphemes without losing key points. 
        ---------
        Current length: {currentCount}
        Current summary: {currentSummary}`;

        const summaryChain = PromptTemplate.fromTemplate(summaryTemplate)
            .pipe(this.model)
            .pipe(new StringOutputParser())

        return await summaryChain.invoke({
            currentSummary: summary,
            currentCount: summary.length,
            maxCharacters
        });
    }
}