import {
  Claim,
  Attestation,
  RequestForAttestation,
  Credential,
  CType,
  Did,
  Balance,
  init,
  CTypeUtils,
  Utils,
  KeyRelationship,
  BlockchainUtils,
} from '@kiltprotocol/sdk-js'
import chalk from 'chalk'
import {
  cryptoWaitReady,
  naclBoxPairFromSecret,
  sr25519PairFromSeed,
  mnemonicToMiniSecret,
  keyExtractPath,
  keyFromPath,
  blake2AsU8a,
} from '@polkadot/util-crypto'
import { getMnemonic, status } from './_prompts.js'
const Attester = {}
async function connect() {
  await status('connecting to network...')
  await cryptoWaitReady()
  await init({ address: 'wss://peregrine.kilt.io/parachain-public-ws' })
}

async function loadAccount(seed) {
  await status('loading account...')
  const signingKeyPairType = 'sr25519'
  const keyring = new Utils.Keyring({
    ss58Format: 38,
    type: signingKeyPairType,
  })

  const mnemonic = seed
  const account = keyring.addFromUri(mnemonic)
  return account
}

async function getKeypairs(account, mnemonic) {
  await status('generating keypairs...')
  const keypairs = {
    authentication: account.derive('//did//0'),
    assertion: account.derive('//did//assertion//0'),
    keyAgreement: (function () {
      const secretKeyPair = sr25519PairFromSeed(mnemonicToMiniSecret(mnemonic))
      const { path } = keyExtractPath('//did//keyAgreement//0')
      const { secretKey } = keyFromPath(secretKeyPair, path, 'sr25519')
      const blake = blake2AsU8a(secretKey)
      const boxPair = naclBoxPairFromSecret(blake)
      return {
        ...boxPair,
        type: 'x25519',
      }
    })(),
  }

  return {
    ...keypairs,
    relationships: {
      [KeyRelationship.authentication]: keypairs.authentication,
      [KeyRelationship.assertionMethod]: keypairs.assertion,
      [KeyRelationship.keyAgreement]: keypairs.keyAgreement,
    },
  }
}

async function getDidDoc(account, keypairs) {
  await status('checking for existing DID...')
  const sign = async ({ data, alg }) => ({
    data: keypairs.authentication.sign(data),
    alg,
  })
  const { extrinsic, did } = await Did.DidUtils.writeDidFromPublicKeys(
    { sign },
    account.address,
    keypairs.relationships
  )
  let didDoc = await Did.DefaultResolver.resolveDoc(did)
  if (didDoc) {
    await status('DID loaded from chain...')
    return didDoc
  }

  await status('checking balance...')

  let balance = parseInt(
    (await Balance.getBalances(account.address)).free.toString()
  )
  if (balance < 3) {
    const message = chalk.red(
      `get testnet tokens to continue => https://faucet.peregrine.kilt.io/?${account.address}`
    )

    await status(message)
    while (balance < 3) {
      balance = parseInt(
        (await Balance.getBalances(account.address)).free.toString()
      )
      await new Promise((r) => setTimeout(r, 2000))
    }
  }

  const resolveOn = BlockchainUtils.IS_FINALIZED
  await BlockchainUtils.signAndSubmitTx(extrinsic, account, { resolveOn })
  await status('DID created on chain...')
  return await Did.DefaultResolver.resolveDoc(did)
}

async function GithubCType() {
  const draft = CType.fromSchema({
    $schema: 'http://kilt-protocol.org/draft-01/ctype#',
    title: 'GitHub',
    properties: {
      Username: {
        type: 'string',
      },
      'User ID': {
        type: 'string',
      },
    },
    type: 'object',
  })

  if (!(await CTypeUtils.verifyStored(draft)))
    console.log('github ctype not stored on peregrine.')
  return draft
}

const githubClaimContents = { Username: 'BigBoy9000', 'User ID': 'Friend' }

async function TwitchCType() {
  const draft = CType.fromSchema({
    $schema: 'http://kilt-protocol.org/draft-01/ctype#',
    title: 'Twitch',
    properties: {
      Username: {
        type: 'string',
      },
      'User ID': {
        type: 'string',
      },
    },
    type: 'object',
  })
  if (!(await CTypeUtils.verifyStored(draft)))
    console.log('twitch ctype not stored on peregrine.')
  return draft
}

const twitchClaimContents = { Username: 'BigBoy9000', 'User ID': 'Friend' }

async function TwitterCType() {
  const draft = CType.fromSchema({
    $schema: 'http://kilt-protocol.org/draft-01/ctype#',
    title: 'Twitter',
    properties: {
      Twitter: {
        type: 'string',
      },
    },
    type: 'object',
  })
  if (!(await CTypeUtils.verifyStored(draft)))
    console.log('twitter ctype not stored on peregrine.')
  return draft
}

const twitterClaimContents = { Twitter: 'BigBoy9000' }

async function EmailCType() {
  const draft = CType.fromSchema({
    $schema: 'http://kilt-protocol.org/draft-01/ctype#',
    title: 'Email',
    properties: {
      Email: {
        type: 'string',
      },
    },
    type: 'object',
  })
  if (!(await CTypeUtils.verifyStored(draft)))
    console.log('email ctype not stored on peregrine.')
  return draft
}

const emailClaimContents = { Email: 'BigBoy9000@howdy' }

async function DiscordCType() {
  const draft = CType.fromSchema({
    $schema: 'http://kilt-protocol.org/draft-01/ctype#',
    title: 'Discord',
    properties: {
      Username: {
        type: 'string',
      },
      Discriminator: {
        type: 'string',
      },
      'User ID': {
        type: 'string',
      },
    },
    type: 'object',
  })
  if (!(await CTypeUtils.verifyStored(draft)))
    console.log('discord ctype not stored on peregrine.')
  return draft
}

const discordClaimContents = {
  Username: 'BigBoy9000',
}

export async function attestClaim(claim, didDoc, account, keypairs) {
  const request = RequestForAttestation.fromClaim(claim)
  await request.signWithKey(
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

  const attestation = Attestation.fromRequestAndDid(request, didDoc.details.did)

  const attested = Boolean(await Attestation.query(attestation.claimHash))
  if (attested)
    return Credential.fromRequestAndAttestation(request, attestation)
  const fullDid = await Did.FullDidDetails.fromChainInfo(didDoc.details.did)
  await attestation
    .store()
    .then((call) =>
      didDoc.authorizeExtrinsic(
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
    .then((tx) => submitExtrinsicWithResign(tx, account))

  return Credential.fromRequestAndAttestation(request, attestation)
}

export default async function () {
  await connect()

  const mnemonic = await getMnemonic()
  const account = await loadAccount(mnemonic)
  const keypairs = await getKeypairs(account, mnemonic)
  const didDoc = await getDidDoc(
    account,
    keypairs,
    'wss://peregrine.kilt.io/parachain-public-ws'
  )

  const githubCType = await GithubCType()
  const discordCType = await DiscordCType()
  const emailCType = await EmailCType()
  const twitchCType = await TwitchCType()
  const twitterCType = await TwitterCType()
  const githubClaim = Claim.fromCTypeAndClaimContents(
    githubCType,
    githubClaimContents,
    didDoc.details.did
  )
  const twitchClaim = Claim.fromCTypeAndClaimContents(
    twitchCType,
    twitchClaimContents,
    didDoc.details.did
  )
  const twitterClaim = Claim.fromCTypeAndClaimContents(
    twitterCType,
    twitterClaimContents,
    didDoc.details.did
  )
  const emailClaim = Claim.fromCTypeAndClaimContents(
    emailCType,
    emailClaimContents,
    didDoc.details.did
  )
  const discordClaim = Claim.fromCTypeAndClaimContents(
    discordCType,
    discordClaimContents,
    didDoc.details.did
  )
  //   const githubCredential = await attestClaim(githubClaim, didDoc, account, keypairs)
  //   const twitchCredential = await attestClaim(twitchClaim, didDoc, account, keypairs)
  const twitterCredential = await attestClaim(
    twitterClaim,
    didDoc,
    account,
    keypairs
  )
  const emailCredential = await attestClaim(
    emailClaim,
    didDoc,
    account,
    keypairs
  )
  const discordCredential = await attestClaim(
    discordClaim,
    didDoc,
    account,
    keypairs
  )
  console.log({
    // githubCredential,
    // twitchCredential,
    twitterCredential,
    emailCredential,
    discordCredential,
  })
  return {
    // githubCredential,
    // twitchCredential,
    twitterCredential,
    emailCredential,
    discordCredential,
  }
}
