import { S3Event } from "aws-lambda";
import {
  S3Client,
  GetObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { Readable } from "stream";
import csv from "csv-parser";

const s3 = new S3Client({ region: process.env.AWS_REGION });

export const handler = async (event: S3Event): Promise<void> => {
  console.log("importFileParser", JSON.stringify(event));

  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));

    console.log(`Processing: s3://${bucket}/${key}`);

    const { Body } = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));

    await new Promise<void>((resolve, reject) => {
      (Body as Readable)
        .pipe(csv())
        .on("data", (row) => console.log("Record:", JSON.stringify(row)))
        .on("end", resolve)
        .on("error", reject);
    });

    const parsedKey = key.replace("uploaded/", "parsed/");

    await s3.send(
      new CopyObjectCommand({
        Bucket: bucket,
        CopySource: `${bucket}/${key}`,
        Key: parsedKey,
      })
    );

    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));

    console.log(`Moved: ${key} -> ${parsedKey}`);
  }
};
