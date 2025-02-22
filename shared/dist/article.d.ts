export declare class Article {
    guid: string;
    creator: string;
    title: string;
    link: string;
    pubDate: string;
    author: string;
    contentSnippet: string;
    categories: string[];
    isoDate: string;
    constructor(guid: string, creator: string, title: string, link: string, pubDate: string, author: string, contentSnippet: string, categories: string[], isoDate: string);
}
export declare class ArticleBuilder {
    private guid;
    private creator;
    private title;
    private link;
    private pubDate;
    private author;
    private contentSnippet;
    private categories;
    private isoDate;
    setGuid(guid: string): this;
    setCreator(creator: string): this;
    setTitle(title: string): this;
    setLink(link: string): this;
    setPubDate(pubDate: string): this;
    setAuthor(author: string): this;
    setContentSnippet(contentSnippet: string): this;
    setCategories(categories: string[]): this;
    setIsoDate(isoDate: string): this;
    build(): Article;
}
