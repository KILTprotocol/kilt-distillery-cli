import {
  Attestation,
  Claim,
  ChainHelpers,
  CType,
  Credential,
  init,
  RequestForAttestation,
  Did,
  BlockchainUtils,
  Utils,
  KeyRelationship,
} from '@kiltprotocol/sdk-js'
import {
  mnemonicGenerate,
  cryptoWaitReady,
  encodeAddress,
} from '@polkadot/util-crypto'
import {
  getMnemonic,
  useExisting,
  getNetwork,
  getOrigin,
  status,
} from './_prompts.js'
import {
  getDidDoc,
  getKeypairs,
  loadAccount,
  resolveOn,
} from './utils/utils.js'
import chalk from 'chalk'
import fs from 'fs'
import mainMenu from './main-menu.js'

const DEFAULT_VERIFIABLECREDENTIAL_TYPE = 'VerifiableCredential'
const KILT_VERIFIABLECREDENTIAL_TYPE = 'KiltCredential2020'
const KILT_SELF_SIGNED_PROOF_TYPE = 'KILTSelfSigned2020'

/**
 * setup verifier results in
 * - encryptionKey
 * - didConfiguration
 * - verifier mnemonic
 */

export default async function ({ returnAssets = false } = {}) {
  const network = await getNetwork()
  const testnet =
    network.indexOf('peregrin') > -1 || network.indexOf('sporran') > -1

  const mnemonic = testnet
    ? (await useExisting())
      ? await getMnemonic()
      : mnemonicGenerate()
    : await getMnemonic()

  const origin = await getOrigin()
  await connect(network)
  await ChainHelpers.BlockchainApiConnection.getConnectionOrConnect()
  const account = await loadAccount(mnemonic)
  const keypairs = await getKeypairs(account, mnemonic)
  const didDoc = await getDidDoc(account, keypairs, network)
  const credential = await getDomainLinkCredential(keypairs, origin, account)
  const didConfig = await getDidConfiguration(credential)
  const dotenv = await getEnvironmentVariables(
    network,
    mnemonic,
    account,
    didDoc,
    origin
  )

  if (returnAssets)
    return {
      network,
      origin,
      mnemonic,
      address: account.address,
      didUri: didDoc.details.uri,
      dotenv,
      didConfig,
    }

  await saveAssets(dotenv, didConfig)
  await status(
    `Done! Assets saved to /verifier-assets\n${chalk.reset.gray(
      '... press any key to return to main menu'
    )}`,
    { keyPress: true }
  )
  return mainMenu()
}

async function connect(network) {
  await status('connecting to network...')
  await cryptoWaitReady()
  await init({ address: network })
}

async function getDomainLinkCredential(keypairs, origin, account) {
  const didUri = Did.Utils.getKiltDidFromIdentifier(
    encodeAddress(keypairs.authentication.publicKey, 38),
    'full'
  )

  const fullDid = await Did.FullDidDetails.fromChainInfo(didUri)

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
    id: fullDid.uri,
    origin: origin,
  }

  const claim = Claim.fromCTypeAndClaimContents(
    ctype,
    claimContents,
    fullDid.uri
  )

  const request = RequestForAttestation.fromClaim(claim)

  const selfSignedRequest = await request.signWithDidKey(
    {
      async sign({ data, alg }) {
        const { authentication } = keypairs
        return {
          data: authentication.sign(data, { withType: false }),
          alg,
        }
      },
    },
    fullDid,
    fullDid.getVerificationKeys(KeyRelationship.authentication)[0].id
  )

  const attestation = Attestation.fromRequestAndDid(
    selfSignedRequest,
    fullDid.uri
  )
  await status(attestation)
  const attested = Boolean(await Attestation.query(attestation.claimHash))
  if (attested) return null

  await attestation
    .getStoreTx()
    .then((call) =>
      fullDid.authorizeExtrinsic(
        call,
        {
          async sign({ data, alg }) {
            const { assertion } = keypairs
            return {
              data: assertion.sign(data, { withType: false }),
              alg,
            }
          },
        },
        account.address
      )
    )
    .then((tx) =>
      BlockchainUtils.signAndSubmitTx(tx, account, {
        reSign: true,
        resolveOn,
      })
    )

  return Credential.fromRequestAndAttestation(request, attestation)
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
    Date.now() + 1000 * 60 * 60 * 24 * 365 * 5
  ).toISOString() // 5 years

  const { claimerSignature } = credential.request

  // add self-signed proof
  const proof = {
    type: KILT_SELF_SIGNED_PROOF_TYPE,
    proofPurpose: 'assertionMethod',
    verificationMethod: claimerSignature.keyId,
    signature: claimerSignature.signature,
    challenge: claimerSignature.challenge,
  }

  return {
    '@context': 'https://identity.foundation/.well-known/did-configuration/v1',
    linked_dids: [
      {
        '@context': [
          'https://www.w3.org/2018/credentials/v1',
          'https://identity.foundation/.well-known/did-configuration/v1',
        ],
        issuer,
        issuanceDate,
        expirationDate,
        type: [
          DEFAULT_VERIFIABLECREDENTIAL_TYPE,
          'DomainLinkageCredential',
          KILT_VERIFIABLECREDENTIAL_TYPE,
        ],
        credentialSubject,
        proof,
      },
    ],
  }
}

async function getEnvironmentVariables(
  network,
  mnemonic,
  account,
  didDoc,
  origin
) {
  await status('Building environment variables...')
  let dotenv = ''
  dotenv += `ORIGIN=${origin}\n`
  dotenv += `WSS_ADDRESS=${network}\n`
  dotenv += `VERIFIER_MNEMONIC=${mnemonic}\n`
  dotenv += `VERIFIER_ADDRESS=${account.address}\n`
  dotenv += `VERIFIER_DID_URI=${didDoc.details.uri}`
  return dotenv
}

async function saveAssets(dotenv, didConfig) {
  await status('Generating Verifier assets...')
  const directory = `${process.cwd()}/verifier-assets`
  fs.rmSync(directory, { recursive: true, force: true })
  fs.mkdirSync(directory)
  fs.writeFileSync(`${directory}/.env`, dotenv, 'utf-8')
  fs.writeFileSync(
    `${directory}/didConfiguration.json`,
    JSON.stringify(didConfig, null, 2),
    'utf-8'
  )
  return true
}
