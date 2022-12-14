import { Utils, Message, MessageBodyType, Credential, Did } from '@kiltprotocol/sdk-js';
import storage from 'memory-cache';
import { exit, methodNotFound, makeEncryptCallback } from '../../utilities/helpers'
import { getFullDid, keypairs } from "../../utilities/verifier";
import { cTypes, clearCookie, createJWT, setCookie } from '../../utilities/auth';

/** verifyRequest
 * verifies credential presentation, returns 200
 * if credential is attested and meets
 */
async function verifyRequest(req, res) {
  // the payload from client
  console.log("going trough verifyRequest")
  const { sessionId, message: rawMessage } = JSON.parse(req.body);

  console.log("inside verify.js", sessionId)

  // load the session, fail if null or missing challenge request
  const session = storage.get(sessionId);
  if (!session) return exit(res, 500, 'invalid session');


  const challenge = session.challenge
  if (!challenge) return exit(res, 500, 'invalid challenge request');

  // get decrypted message
  const fullDid = await getFullDid();
  const { keyAgreement } = await keypairs();
  const signer = makeEncryptCallback(keyAgreement);
  const message = await Message.decrypt(rawMessage, signer(fullDid.document));
  const messageBody = message.body;
  const { type, content } = messageBody;

  // fail if incorrect message type
  if (type !== 'submit-credential') {
    res.statusMessage = 'unexpected message type';
    return res.status(500).end();
  }

  // load the credential, check attestation and ownership
  const credential = Credential.fromCredential(content[0].claim);
  await Credential.verify(credential, { challenge });
  const { owner } = credential.claim
  console.log(owner)
  const did = owner.includes(':light:') ? `did:kilt:${owner.split(':')[3]}` : owner

  // fail if not attested or owner
  if (!isValid) return exit(403, 'invalid credential')

  // credential valid, business logic here...
  // set JWT session token, issue privelaged response etc..
  // here we just set verified to true for other hypothetical calls
  storage.put(sessionId, { ...session, verified: true });

  if (!did) {
    // if invalid clear httpOnly cookie & send 401
    clearCookie(res, { name: 'token' })
    return res.status(401).send('')
  }

  // if valid create JWT from DID, set httpOnly cookie, return 200 with DID
  const token = createJWT(did)
  setCookie(res, { name: 'token', data: token })
  res.status(200).send(did)
  return res.status(200).end();
}

/** getRequest
 * creates and returns an encrypted message for
 * Sporran session to prompt credential sharing
 */
async function getRequest(req, res) {
  const { sessionId } = req.query;
  console.log("a) inside verify.js getRequest()")
  // load the session
  const session = storage.get(sessionId);
  if (!session) return exit(res, 500, 'invalid session');

  // load encryptionKeyId and the did, making sure it's confirmed
  const { did, didConfirmed, encryptionKeyUri } = session;
  console.log("b) inside verify.js getRequest", session)
  if (!did || !didConfirmed) return exit(res, 500, 'unconfirmed did');
  if (!encryptionKeyUri) return exit(res, 500, 'missing encryptionKeyId');
  const encryptionKey = await Did.resolveKey(encryptionKeyUri)

  // set the challenge
  const challenge = Utils.UUID.generate();
  storage.put(sessionId, { ...session, challenge });

  // construct the message
  const content = { ...cTypes, challenge };
  const type = 'request-credential'; //before: MessageBodyType.REQUEST_CREDENTIAL<
  const didUri = process.env.VERIFIER_DID_URI;
  console.log("c) didUri in the verify.js:  (inside the getRequest)", didUri)
  // const keyDid = encryptionKeyId.replace(/#.*$/, ''); // outdated
  const message = Message.fromBody({ content, type }, didUri, encryptionKey.controller); // encryptionKey.controller is the receiver light DidUri
  if (!message) return exit(res, 500, 'failed to construct message');
  console.log("d) the message before encrypting: ", message)

  const fullDid = await getFullDid();

  // encrypt the message
  const { keyAgreement } = await keypairs();
  const signer = makeEncryptCallback(keyAgreement);


  const output = await Message.encrypt(message, signer(fullDid.document), encryptionKey.id);// encryptionKey.id is {encryptionKey.controller}#encryption
  if (!output) return exit(res, 500, `failed to encrypt message`);
  console.log("d) the message after encrypting: ", output)



  console.log("e) leaving verify.js getRequest()")

  res.status(200).send(output);
}

// expose GET and POST routes
export default async function handler(req, res) {
  const { method = '404' } = req;
  const actions = {
    GET: getRequest,
    POST: verifyRequest,
    404: methodNotFound,
  };

  await actions[method](req, res);
}