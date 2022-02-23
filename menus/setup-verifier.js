import { Attestation, BlockchainUtils, Credential, Claim, RequestForAttestation, CType, Utils, Did, KeyRelationship, init, Balance } from '@kiltprotocol/sdk-js'
import { mnemonicGenerate, mnemonicValidate, cryptoWaitReady, naclBoxPairFromSecret, sr25519PairFromSeed, mnemonicToMiniSecret, keyExtractPath, keyFromPath, blake2AsU8a } from '@polkadot/util-crypto'
import chalk from 'chalk'
import fs from 'fs'
import mainMenu from './main-menu.js'
import { prompt, status } from './_utilities.js'

// excite grace cradle merge energy they excuse rifle blanket rose dose same
export default async function() {
  const network = await getNetwork()
  const mnemonic = network === 'mainnet' ? 
    await getMnemonic() :
    await useExisting() ? 
    await getMnemonic() :
    null

  const origin = await getOrigin()
  await connect(network)
  const account = await loadAccount(mnemonic)
  const keypairs = await getKeypairs(account, mnemonic)
  const didDoc = await getDidDoc(account, keypairs, network)
  const encryptionKey = await getEncryptionKey(didDoc)
  const credential = await getDomainLinkCredential(keypairs, didDoc, origin)
  const didConfig = await getDidConfiguration(credential)
  const dotenv = await getEnvironmentVariables(network, mnemonic, account, didDoc)
  await createAssets(dotenv, didConfig, encryptionKey)
  await status(`Done! Assets saved to /verifier-assets\n${chalk.reset.gray('... press any key to return to main menu')}`, { keyPress: true })
  return mainMenu()
}

async function getMnemonic() {
  return (await prompt({
    type: 'input',
    name: 'mnemonic',
    message: `enter mnemonic\n${chalk.cyan('❯')}`,
    validate: mnemonic => mnemonicValidate(mnemonic) || 'invalid mnemonic',
  })).mnemonic
}

async function useExisting() {
  return (await prompt({
    type: 'list',
    name: 'method',
    message: 'mnemonic',
    choices: [
      { name: 'use an existing mnemonic', value: 'existing' },
      { name: 'generate a new mnemonic', value: 'generate' },
    ]
  })).method === 'existing'
}

async function getNetwork() {
  return (await prompt({
    type: 'list',
    name: 'network',
    message: 'select network',
    choices: [
      { name: 'testnet', value: 'wss://peregrine.kilt.io/parachain-public-ws' },
      { name: 'mainnet', value: 'wss://spiritnet.api.onfinality.io/public-ws' },
    ]
  })).network
}

async function getOrigin() {
  return (await prompt({
    type: 'input',
    name: 'origin',
    message: `enter origin ${chalk.reset.gray('(https://example.com || http://localhost:3000)')}\n${chalk.cyan('❯')}`,
    validate: origin => (origin.startsWith('http://localhost:') || validUrl.isUri(origin)) || 'invalid origin',
  })).origin
}

async function connect(network) {
  await status('connecting to network...')
  await cryptoWaitReady()
  await init({ address: network })
}

async function loadAccount(seed) {
  await status('loading account...')
  const signingKeyPairType = 'sr25519'
  const keyring = new Utils.Keyring({
    ss58Format: 38,
    type: signingKeyPairType,
  })

  const mnemonic = seed || mnemonicGenerate()
  const account = keyring.addFromMnemonic(
    mnemonic,
    { signingKeyPairType }
  )
  return account
}

async function getKeypairs(account, mnemonic) {
  await status('generating keypairs...')
  const keypairs = {
    authentication: account.derive('//did//0'),
    assertion: account.derive('//did//assertion//0'),
    keyAgreement: (function() {
      const secretKeyPair = sr25519PairFromSeed(mnemonicToMiniSecret(mnemonic))
      const { path } = keyExtractPath('//did//keyAgreement//0')
      const { secretKey } = keyFromPath(secretKeyPair, path, 'sr25519')
      const blake = blake2AsU8a(secretKey)
      const boxPair = naclBoxPairFromSecret(blake)
      return {
        ...boxPair,
        type: 'x25519',
      }
    }())
  }

  return {
    ...keypairs,
    relationships: {
      [KeyRelationship.authentication]: keypairs.authentication,
      [KeyRelationship.assertionMethod]: keypairs.assertion,
      [KeyRelationship.keyAgreement]: { ...keypairs.keyAgreement, type: 'x25519' },
    }
  }
}

async function getDidDoc(account, keypairs, network) {
  await status('checking for existing DID...')
  const sign = async ({ data, alg }) => ({ data: keypairs.authentication.sign( data ), alg })
  const { extrinsic, did } = await Did.DidUtils.writeDidFromPublicKeys({ sign }, account.address, keypairs.relationships)
  let didDoc = await Did.DefaultResolver.resolveDoc(did)
  if (didDoc) {
    await status('DID loaded from chain...')
    return didDoc
  }

  await status('checking balance...')
  const testnet = network.indexOf('peregrine') > 0
  let balance = parseInt((await Balance.getBalances(account.address)).free.toString())
  if (balance < 3) {
    const message = testnet 
      ? chalk.red(`get testnet tokens to continue => https://faucet.peregrine.kilt.io/?${account.address}`)
      : chalk.red(`balance too low... to continue send 3 or more KILT to: ${account.address}`)
    
    await status(message)
    while(balance < 3) {
      balance = parseInt((await Balance.getBalances(account.address)).free.toString())
      await new Promise(r => setTimeout(r, 2000))
    }
  }

  const resolveOn = BlockchainUtils.IS_FINALIZED
  await BlockchainUtils.signAndSubmitTx(extrinsic, account, { resolveOn })
  await status('DID created on chain...')
  return await Did.DefaultResolver.resolveDoc(did)
}

async function getEncryptionKey(didDoc) {
  await status('Getting encryption key json...')
  return didDoc.details.getKeys('keyAgreement').pop()
}

async function getDomainLinkCredential(keypairs, didDoc, origin) {
  await status('Creating Domain Linkage Credential...')
  const ctype = CType.fromSchema({
    $schema: 'http://kilt-protocol.org/draft-01/ctype#',
    title: 'Domain Linkage Credential',
    properties: {
      id: {
        type: 'string',
      },
      origin: {
        type: 'string',
      },
    },
    type: 'object',
  })

  const claimContents = {
    id: didDoc.details.did,
    origin: origin,
  }

  const claim = Claim.fromCTypeAndClaimContents(
    ctype,
    claimContents,
    didDoc.details.did
  )

  const requestForAttestation = RequestForAttestation.fromClaim(claim)
  const { signature, keyId } = await Did.DidUtils.signWithDid(
    Utils.Crypto.coToUInt8(requestForAttestation.rootHash),
    didDoc.details,
    {
      async sign({ data, alg }) {
        const { assertion } = keypairs
        return {
          data: assertion.sign(data, { withType: false }),
          alg,
        }
      },
    },
    didDoc.details.getKeyIds(KeyRelationship.assertionMethod)[0]
  )

  const selfSignedRequest = await requestForAttestation.addSignature(
    signature,
    keyId
  )

  const attestation = Attestation.fromRequestAndDid(
    selfSignedRequest,
    didDoc.details.did
  )

  return Credential.fromRequestAndAttestation(
    selfSignedRequest,
    attestation
  )
}

async function getDidConfiguration(credential) {
  await status('Creating DID configuration JSON...')
  const credentialSubject = {
    ...credential.request.claim.contents,
    rootHash: credential.request.rootHash,
  }

  const issuer = credential.attestation.owner

  const issuanceDate = new Date().toISOString()
  const expirationDate = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 365 * 5,
  ).toISOString() // 5 years

  const { claimerSignature } = credential.request

  // add self-signed proof
  const proof = {
    type: 'KILTSelfSigned2020',
    proofPurpose: 'assertionMethod',
    verificationMethod: claimerSignature.keyId,
    signature: claimerSignature.signature,
    challenge: claimerSignature.challenge,
  }
  
  return {
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      'https://identity.foundation/.well-known/did-configuration/v1',
    ],
    issuer,
    issuanceDate,
    expirationDate,
    type: [
      'VerifiableCredential',
      'DomainLinkageCredential',
      'KiltCredential2020',
    ],
    credentialSubject,
    proof,
  }
}

async function getEnvironmentVariables(network, mnemonic, account, didDoc) {
  await status('Building environment variables...')
  let dotenv = ''
  dotenv += `WS_ADDRESS=${network}\n`
  dotenv += `VERIFIER_MNEMONIC=${mnemonic}\n`
  dotenv += `VERIFIER_ADDRESS=${account.address}\n`
  dotenv += `VERIFIER_DID=${didDoc.details.didUri}`
  return dotenv
}

async function createAssets(dotenv, encryptionKey, didConfig) {
  await status('Generating Verifier assets...')
  const directory = `${process.cwd()}/verifier-assets`
  fs.rmSync(directory, { recursive: true, force: true })
  fs.mkdirSync(directory)
  fs.writeFileSync(`${directory}/.env`, dotenv, 'utf-8')
  fs.writeFileSync(`${directory}/didConfiguration.json`, JSON.stringify(didConfig, null, 2), 'utf-8')
  fs.writeFileSync(`${directory}/encryptionKey.json`, JSON.stringify(encryptionKey, null, 2), 'utf-8')
  return true
}
