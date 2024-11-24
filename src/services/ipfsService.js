import { create } from 'ipfs-http-client';
import { Buffer } from 'buffer';

const projectId = ''; // Add your Infura project ID
const projectSecret = ''; // Add your Infura secret
const auth = 'Basic ' + Buffer.from(projectId + ':' + projectSecret).toString('base64');

const ipfs = create({
  host: 'localhost',
  port: 5001,
  protocol: 'http',
});

export const uploadToIPFS = async (data) => {
  try {
    const buffer = Buffer.from(JSON.stringify(data));
    const result = await ipfs.add(buffer);
    return result.path;
  } catch (error) {
    console.error('Error uploading to IPFS:', error);
    throw error;
  }
};

export const getFromIPFS = async (hash) => {
  try {
    const stream = ipfs.cat(hash);
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    const data = buffer.toString();
    return JSON.parse(data);
  } catch (error) {
    console.error('Error getting from IPFS:', error);
    throw error;
  }
};
