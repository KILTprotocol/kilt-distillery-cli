import { connect, DidDocument, KeyringPair } from '@kiltprotocol/sdk-js'
import { mnemonicGenerate } from '@polkadot/util-crypto'
import { getMnemonic, useExisting, getNetwork, status } from './_prompts'
import { loadAccount } from './utils/loadAccount'
import { getDidDoc } from './utils/getDidDoc'
import { getKeypairs } from './utils/getKeypairs'
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

  await status('connecting to network...')
  await connect(network)
  const account = await loadAccount({ seed: mnemonic })
  const keypairs = await getKeypairs(mnemonic)
  const didDoc = await getDidDoc({ account, keypairs, network })
  const dotenv = await getEnvironmentVariables(
    network,
    mnemonic,
    account,
    didDoc
  )

  if (returnAssets) {
    return {
      network,
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
  network: string,
  mnemonic: string,
  account: KeyringPair,
  didDoc: DidDocument
): Promise<string> {
  await status('Building environment variables...')
  let dotenv = ''
  dotenv += `WSS_ADDRESS=${network}\n`
  dotenv += `ACCOUNT_MNEMONIC=${mnemonic}\n`
  dotenv += `ACCOUNT_ADDRESS=${account.address}\n`
  dotenv += `ACCOUNT_DID_URI=${didDoc.uri}`
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
