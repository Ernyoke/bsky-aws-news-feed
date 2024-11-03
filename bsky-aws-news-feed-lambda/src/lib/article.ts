export class Article {
    constructor(public guid: string,
        public creator: string,
        public title: string,
        public link: string,
        public pubDate: string,
        public author: string,
        public contentSnippet: string,
        public categories: string[],
        public isoDate: string
    ) { }
}