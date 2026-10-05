import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { Readable } from 'node:stream';
import { config } from '../config.js';

export class S3StorageService {
  private static instance: S3StorageService;
  private client: S3Client;
  public readonly bucket: string;

  private constructor() {
    this.bucket = config.minio.bucket;
    this.client = new S3Client({
      endpoint: `http://${config.minio.endpoint}:${config.minio.port}`,
      region: 'us-east-1',
      credentials: {
        accessKeyId: config.minio.accessKey,
        secretAccessKey: config.minio.secretKey,
      },
      forcePathStyle: true, // Required for MinIO
      tls: config.minio.useSSL,
    });
  }

  public static getInstance(): S3StorageService {
    if (!S3StorageService.instance) {
      S3StorageService.instance = new S3StorageService();
    }
    return S3StorageService.instance;
  }

  public async ensureBucketExists(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      try {
        await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
        console.log(`[S3StorageService] Created bucket: ${this.bucket}`);
      } catch (err) {
        console.error(`[S3StorageService] Failed to create bucket ${this.bucket}:`, err);
      }
    }
  }

  public async saveSnapshot(key: string, data: Uint8Array): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: Buffer.from(data),
      ContentType: 'application/octet-stream',
    });
    await this.client.send(command);
  }

  public async getSnapshot(key: string): Promise<Uint8Array> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    const response = await this.client.send(command);
    if (!response.Body) {
      throw new Error(`Snapshot not found or empty Body for key: ${key}`);
    }

    const stream = response.Body as Readable;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    return new Uint8Array(Buffer.concat(chunks));
  }

  public async listFiles(prefix = ''): Promise<{ key: string; size: number; lastModified?: Date }[]> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
      });
      const res = await this.client.send(command);
      return (res.Contents || []).map((item) => ({
        key: item.Key || '',
        size: item.Size || 0,
        lastModified: item.LastModified,
      }));
    } catch (err) {
      console.warn('[S3StorageService] listFiles error:', err);
      return [];
    }
  }

  public async uploadFile(key: string, data: Buffer, contentType = 'application/octet-stream'): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: data,
      ContentType: contentType,
    });
    await this.client.send(command);
  }

  public async deleteObject(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    await this.client.send(command);
  }
}
