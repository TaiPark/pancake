import {
  S3Client,
  CreateBucketCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
  PutObjectCommand
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const photoBucket = process.env.S3_BUCKET ?? "pancake-photos";

export const s3 = new S3Client({
  region: process.env.S3_REGION ?? "us-east-1",
  endpoint: process.env.S3_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "pancake",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "pancake-secret"
  }
});

export function publicPhotoUrl(objectKey: string) {
  const endpoint = process.env.S3_PUBLIC_ENDPOINT ?? process.env.S3_ENDPOINT ?? "http://localhost:9000";
  return `${endpoint.replace(/\/$/, "")}/${photoBucket}/${objectKey}`;
}

let bucketReady: Promise<void> | null = null;

async function ensurePhotoBucket() {
  if (!bucketReady) {
    bucketReady = (async () => {
      try {
        await s3.send(new HeadBucketCommand({ Bucket: photoBucket }));
      } catch {
        await s3.send(new CreateBucketCommand({ Bucket: photoBucket }));
      }

      const policy = {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: { AWS: ["*"] },
            Action: ["s3:GetObject"],
            Resource: [`arn:aws:s3:::${photoBucket}/*`]
          }
        ]
      };

      await s3.send(
        new PutBucketPolicyCommand({
          Bucket: photoBucket,
          Policy: JSON.stringify(policy)
        })
      );
    })();
  }

  return bucketReady;
}

export async function createPhotoUploadUrl(objectKey: string, contentType: string) {
  await ensurePhotoBucket();

  return getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: photoBucket,
      Key: objectKey,
      ContentType: contentType
    }),
    { expiresIn: 300 }
  );
}

export async function deletePhotoObject(objectKey: string) {
  await s3.send(
    new DeleteObjectCommand({
      Bucket: photoBucket,
      Key: objectKey
    })
  );
}
