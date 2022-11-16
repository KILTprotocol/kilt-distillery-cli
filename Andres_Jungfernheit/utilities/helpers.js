import { Did, connect, disconnect} from "@kiltprotocol/sdk-js";
import { cryptoWaitReady } from "@polkadot/util-crypto";


export const exit = (response, status, message) => {
  response.statusMessage = message;
  return response.status(status).end();
}

export async function methodNotFound(request, response) {
  response.statusMessage = `method ${method} no found`;
  response.status(400).end();
}

export async function getEncryptionKey(encryptionKeyId) {
  await cryptoWaitReady();
  await connect( process.env.WSS_ADDRESS );
  const encryptionKey = await Did.resolveKey(encryptionKeyId);
  await disconnect();
  return encryptionKey
  
}