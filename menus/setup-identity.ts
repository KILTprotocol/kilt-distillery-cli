import { connect, DidDocument, KeyringPair } from '@kiltprotocol/sdk-js'
import { mnemonicGenerate } from '@polkadot/util-crypto'
import {
  getMnemonic,
  useExisting,
  getNetwork,
  getOrigin,
  status,
} from './_prompts'
import { getDidDoc, getKeypairs, loadAccount } from './utils/utils'
import chalk from 'chalk'
import * as fs from 'fs'
import mainMenu from './main-menu'

/**
 * Setup Account results in
 * - encryptionKey
 * - Account mnemonic
 * - Account DID
 */

export default async function ({ returnAssets = false } = {}): Promise<any> {
  const network = await getNetwork()
  const testnet =
    network.indexOf('peregrin') > -1 || network.indexOf('sporran') > -1

  const mnemonic = testnet
    ? (await useExisting())
      ? await getMnemonic()
      : mnemonicGenerate()
    : await getMnemonic()

  const origin = await getOrigin()
  await status('connecting to network...')
  await connect('wss://peregrine.kilt.io/parachain-public-ws')
  const account = await loadAccount(mnemonic)
  const keypairs = await getKeypairs(account, mnemonic)
  const didDoc = await getDidDoc(account, keypairs, network)
  const dotenv = await getEnvironmentVariables(
    network,
    mnemonic,
    account,
    didDoc,
    origin
  )

  if (returnAssets) {
    return {
      network,
      origin,
      mnemonic,
      address: account.address,
      didUri: didDoc.uri,
      dotenv,
    }
  }

  await saveAssets(dotenv)
  await status(
    `Done! Assets saved to /Account-assets\n${chalk.reset.gray(
      '... press any key to return to main menu'
    )}`,
    {
      keyPress: true,
      wait: 0,
    }
  )
  return mainMenu()
}

async function getEnvironmentVariables(
  network: any,
  mnemonic: any,
  account: KeyringPair,
  didDoc: DidDocument,
  origin: any
) {
  await status('Building environment variables...')
  let dotenv = ''
  dotenv += `ORIGIN=${origin}\n`
  dotenv += `WSS_ADDRESS=${network}\n`
  dotenv += `Account_MNEMONIC=${mnemonic}\n`
  dotenv += `Account_ADDRESS=${account.address}\n`
  dotenv += `Account_DID_URI=${didDoc.uri}`
  return dotenv
}

async function saveAssets(dotenv: string) {
  await status('Generating Account assets...')
  const directory = `${process.cwd()}/Account-assets`
  fs.rmSync(directory, { recursive: true, force: true })
  fs.mkdirSync(directory)
  fs.writeFileSync(`${directory}/.env`, dotenv, 'utf-8')
  return true
}
