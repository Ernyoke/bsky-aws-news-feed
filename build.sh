#!/bin/bash

set -e +x

cd shared && npm install --install-links --cpu=arm64 --os=linux --omit=dev --ignore-scripts && npm run build
cd ..
cd bsky-aws-news-feed-fetcher-lambda-layer/nodejs && npm install --install-links --cpu=arm64 --os=linux --omit=dev --ignore-scripts
cd ../..
cd bsky-aws-news-feed-lambda-layer/nodejs && npm install --install-links --cpu=arm64 --os=linux --omit=dev --ignore-scripts
cd ../..
cd bsky-aws-news-feed-fetcher-lambda && npm install && npm run build
cd ..
cd bsky-aws-news-feed-lambda && npm install && npm run build
cd ..