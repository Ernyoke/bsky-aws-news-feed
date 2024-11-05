import {GetObjectCommand, S3Client} from "@aws-sdk/client-s3";
import {config} from "./config.js";

const bucketName = config.bucketName;

const client = new S3Client({});

export async function getObjectFromResources(objectKey: string): Promise<Uint8Array | undefined | null> {
    const response = await client.send(
        new GetObjectCommand({
            Bucket: bucketName,
            Key: objectKey,
        }),
    );

    return response.Body?.transformToByteArray();
}
