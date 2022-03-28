import inquirer from 'inquirer'
import chalk from 'chalk' 
import { mnemonicValidate } from '@polkadot/util-crypto'

async function prompt (prompt) {
  console.clear()
  return await inquirer.prompt({
    ...prompt,
    prefix: `${chalk.bold(' KILT CLI ')}-`,
  })
}

export async function status(msg, opts = {}) {
  return new Promise(async resolve => {
    const { wait = 500, keyPress = false } = opts
    console.clear()
    console.log(chalk.bold(` KILT DISTILLERY CLI - ${chalk.reset(msg)}`))
    if (!keyPress) return setTimeout(resolve, wait)
    process.stdin.setRawMode(true)
    process.stdin.resume()
    process.stdin.on('data', resolve)
  })
}

export async function mainMenu() {
  return (await prompt({
    type: 'list',
    name: 'action',
    message: 'select action',
    choices: [
      { name: 'setup verifier assets', value: 'setupVerifier' },
      { name: 'setup claimer socialKYC credential', value: 'setupClaimer' },
      { name: 'create project from recipe', value: 'createProject' },
      { name: 'exit', value: 'exitCLI' },
    ],
  })).action
}

export async function getMnemonic() {
  return (await prompt({
    type: 'input',
    name: 'mnemonic',
    message: `enter mnemonic\n${chalk.cyan('❯')}`,
    validate: mnemonic => mnemonicValidate(mnemonic) || 'invalid mnemonic',
  })).mnemonic
}

export async function useExisting() {
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

export async function getNetwork() {
  return (await prompt({
    type: 'list',
    name: 'network',
    message: 'select network',
    choices: [
      { name: 'testnet', value: 'wss://peregrine.kilt.io/parachain-public-ws' },
      { name: 'sporran', value: 'wss://sporran-testnet.kilt.io'},
      { name: 'mainnet', value: 'wss://spiritnet.api.onfinality.io/public-ws' },
    ]
  })).network
}

export async function getOrigin() {
  return (await prompt({
    type: 'input',
    name: 'origin',
    message: `enter origin ${chalk.reset.gray('(https://example.com || http://localhost:3000)')}\n${chalk.cyan('❯')}`,
    validate: origin => (origin.startsWith('http://localhost:') || validUrl.isUri(origin)) || 'invalid origin',
  })).origin
}

export async function getProjectRecipe() {
  return (await prompt({
    type: 'list',
    name: 'project',
    message: 'select project',
    choices: [
      { name: 'NextJS Login w/Sporran & DID Signature', value: 'nextjs-sporran-did-login' },
      { name: 'NextJS Login w/Sporran & Credential Verification', value: 'nextjs-sporran-credential-login' },
      { name: 'Cancel', value: 'cancel' },
    ]
  })).project
}

export async function getJWTExpiry() {
  return (await prompt({
    type: 'input',
    name: 'expiry',
    message: 'how long should JWT be valid?'
  })).expiry
}

export async function getJWTRenewal() {
  return (await prompt({
    type: 'list',
    name: 'renew',
    message: 'auto renew the JWT?',
    choices: [
      { name: 'yes', value: 'true' },
      { name: 'no', value: 'false' },
    ]
  })).renew === 'true'
}

export async function getDappName() {
  return (await prompt({
    type: 'input',
    name: 'dappName',
    message: "what's the dapp's name?"
  })).dappName
}