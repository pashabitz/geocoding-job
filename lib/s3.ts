import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

export async function storeFile(file: File) {
    const s3 = new S3Client({
        region: process.env.AWS_REGION,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
    });
    const buffer = Buffer.from(await file.arrayBuffer());
    const key = new Date().toISOString();
    const bucket = process.env.AWS_S3_BUCKET_NAME!;
    const uploadParams = {
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: file.type,
    };
    const s3PutOutput = await s3.send(new PutObjectCommand(uploadParams));
    return { s3PutOutput, key: `s3://${bucket}/${key}` };
}
