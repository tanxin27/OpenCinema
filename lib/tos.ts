import { TosClient, ACLType } from "@volcengine/tos-sdk";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { getSetting } from "@/lib/settings";

export interface TosConfig {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucket: string;
  endpoint: string;
}

export async function getTosConfig(): Promise<TosConfig | null> {
  const accessKeyId = await getSetting("TOS_ACCESS_KEY_ID");
  const secretAccessKey = await getSetting("TOS_SECRET_ACCESS_KEY");
  const region = await getSetting("TOS_REGION");
  const bucket = await getSetting("TOS_BUCKET");

  if (!accessKeyId || !secretAccessKey || !region || !bucket) {
    return null;
  }

  const customEndpoint = await getSetting("TOS_ENDPOINT");
  let endpoint = customEndpoint || `tos-${region}.volces.com`;
  // SDK expects bare domain without protocol prefix
  endpoint = endpoint.replace(/^https?:\/\//, "");

  return { accessKeyId, secretAccessKey, region, bucket, endpoint };
}

export async function createTosClient(): Promise<TosClient> {
  const config = await getTosConfig();
  if (!config) {
    throw new Error("TOS not configured");
  }

  return new TosClient({
    accessKeyId: config.accessKeyId,
    accessKeySecret: config.secretAccessKey,
    region: config.region,
    endpoint: config.endpoint,
  });
}

export async function uploadFileToTos(
  filePath: string,
  objectKey: string,
  contentType?: string
): Promise<string> {
  const config = await getTosConfig();
  if (!config) {
    throw new Error("TOS not configured");
  }

  const client = await createTosClient();
  const fileStream = createReadStream(filePath);
  const stats = await stat(filePath);

  await client.putObject({
    bucket: config.bucket,
    key: objectKey,
    body: fileStream,
    contentLength: stats.size,
    contentType: contentType || "application/octet-stream",
    acl: ACLType.ACLPublicRead,
  });

  return `https://${config.bucket}.tos-${config.region}.volces.com/${objectKey}`;
}
