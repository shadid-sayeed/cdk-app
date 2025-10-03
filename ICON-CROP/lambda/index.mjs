import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';

const s3Client = new S3Client({});

export const handler = async (event) => {
  const sourceBucket = process.env.SOURCE_BUCKET;
  const destinationBucket = process.env.DESTINATION_BUCKET;
  const key = decodeURIComponent(event.queryStringParameters.key.replace(/\+/g, ' '));

  // Debugging: Log the received key
  console.log('Received key:', key);

  try {
    const getObjectParams = { Bucket: sourceBucket, Key: key };
    const s3Object = await s3Client.send(new GetObjectCommand(getObjectParams));
    const objectBody = s3Object.Body;

    const chunks = [];
    for await (const chunk of objectBody) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    const resizedImage = await sharp(buffer)
      .resize(200, 200, {
        fit: sharp.fit.inside,
        withoutEnlargement: true
      })
      .toBuffer();

    const newKey = key.replace('uploads/', 'processed/');
    const putObjectParams = {
      Bucket: destinationBucket,
      Key: newKey,
      Body: resizedImage,
      ContentType: 'image/jpeg'
    };
    await s3Client.send(new PutObjectCommand(putObjectParams));

    const deleteObjectParams = { Bucket: sourceBucket, Key: key };
    await s3Client.send(new DeleteObjectCommand(deleteObjectParams));

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Image processed and deleted successfully', newKey })
    };

  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to process and delete image' })
    };
  }
};