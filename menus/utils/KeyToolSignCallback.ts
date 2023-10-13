import { DidDocument, SignCallback } from '@kiltprotocol/sdk-js'


export type KeyToolSignCallback = (didDocument: DidDocument) => SignCallback;
