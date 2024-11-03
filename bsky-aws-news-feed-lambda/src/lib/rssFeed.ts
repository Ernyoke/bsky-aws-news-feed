import Parser from 'rss-parser';
import { Article } from './article.js';

export class Feed {
    public constructor(public articles: Article[],
        public lastBuildDate: string,
        public imageUrl: string | undefined) { }
}

const parser = new Parser();

export default async function fetchRss(): Promise<Feed> {
    const feed = await parser.parseURL('https://aws.amazon.com/about-aws/whats-new/recent/feed/');
    const articles = feed.items as Article[];

    // fix categories
    for(const article of articles) {
        article.categories = article.categories.flatMap(categoriesStr => categoriesStr.split(','));
    }

    return new Feed(articles, feed.lastBuildDate, feed.image?.url);
}