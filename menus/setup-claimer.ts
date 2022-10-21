import { Claim, connect, Credential } from '@kiltprotocol/sdk-js'
import { status, getClaimDetails } from './_prompts'
import mainMenu from './main-menu'
import {
  getAllSocialCTypes,
  attestClaim,
  loadAccount,
  getKeypairs,
  getDidDoc,
} from './utils/utils'

import chalk from 'chalk'
import * as fs from 'fs'
import { mnemonicGenerate } from '@polkadot/util-crypto'
import { Presentation } from '../types/types'

function saveAssets(credentials: Array<Presentation>) {
  const directory = `${process.cwd()}/claimer-credentials`
  fs.rmSync(directory, { recursive: true, force: true })
  fs.mkdirSync(directory)
  credentials.forEach((presentation: Presentation) => {
    fs.writeFileSync(
      `${directory}/${presentation.name}.json`,
      JSON.stringify(presentation, null, 2),
      'utf-8'
    )
  })
}

export default async function (): Promise<any> {
  await status('connecting to network...')
  await connect('wss://peregrine.kilt.io/parachain-public-ws')
  const mnemonic = mnemonicGenerate()
  const account = await loadAccount(mnemonic)
  const keypairs = await getKeypairs(account, mnemonic)
  const didDoc = await getDidDoc(
    account,
    keypairs,
    'wss://peregrine.kilt.io/parachain-public-ws'
  )

  const { githubCType, discordCType, emailCType, twitchCType, twitterCType } =
    await getAllSocialCTypes(account, keypairs)

  await status('Generating claimer github claim content...')
  const githubClaimContents = await getClaimDetails(githubCType.properties)

  await status('Generating claimer twitch claim content...')
  const twitchClaimContents = await getClaimDetails(twitchCType.properties)

  await status('Generating claimer twitter claim content...')
  const twitterClaimContents = await getClaimDetails(twitterCType.properties)

  await status('Generating claimer email claim content...')
  const emailClaimContents = await getClaimDetails(emailCType.properties)

  await status('Generating claimer discord claim content...')
  const discordClaimContents = await getClaimDetails(discordCType.properties)

  const githubClaim = Claim.fromCTypeAndClaimContents(
    githubCType,
    githubClaimContents,
    didDoc.uri
  )
  const twitchClaim = Claim.fromCTypeAndClaimContents(
    twitchCType,
    twitchClaimContents,
    didDoc.uri
  )
  const twitterClaim = Claim.fromCTypeAndClaimContents(
    twitterCType,
    twitterClaimContents,
    didDoc.uri
  )
  const emailClaim = Claim.fromCTypeAndClaimContents(
    emailCType,
    emailClaimContents,
    didDoc.uri
  )
  const discordClaim = Claim.fromCTypeAndClaimContents(
    discordCType,
    discordClaimContents,
    didDoc.uri
  )

  const credentials = [
    {
      ctype: 'peregrine github',
      credential: Credential.fromClaim(githubClaim),
    },
    {
      ctype: 'peregrine twitch',
      credential: Credential.fromClaim(twitchClaim),
    },
    {
      ctype: 'peregrine twitter',
      credential: Credential.fromClaim(twitterClaim),
    },
    { ctype: 'peregrine email', credential: Credential.fromClaim(emailClaim) },
    {
      ctype: 'peregrine discord',
      credential: Credential.fromClaim(discordClaim),
    },
  ]

  await status('Self-attesting the claims...')
  const credentialPresentations = await attestClaim(
    credentials,
    account,
    keypairs
  )

  await status('Generating claimer credentials assets...')
  saveAssets(credentialPresentations)

  fs.writeFileSync(
    `${process.cwd()}/claimer-credentials/.env`,
    `CLAIMER_MNEMONIC=${mnemonic}\nCLAIMER_DID=${didDoc.uri}`,
    'utf-8'
  )

  await status(
    `Done! Assets saved to /claimer-assets\n${chalk.reset.gray(
      '... press any key to return to main menu'
    )}`,
    { keyPress: true }
  )

  return await mainMenu()
}
