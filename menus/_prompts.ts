import inquirer, { Answers, QuestionCollection } from 'inquirer'
import chalk from 'chalk'
import { mnemonicValidate } from '@polkadot/util-crypto'
import PressToContinuePrompt from 'inquirer-press-to-continue'
import projects from './projects/index'
import { InstanceType } from '@kiltprotocol/sdk-js'
import * as validUrl from 'valid-url'

inquirer.registerPrompt('press-to-continue', PressToContinuePrompt)

async function prompt(prompt: QuestionCollection<Answers>) {
  console.clear()
  return await inquirer.prompt({
    ...prompt,
    //@ts-ignore
    prefix: `${chalk.bold(' KILT CLI ')}-`,
  })
}

export async function status(
  msg: string,
  { wait = 500, keyPress = false }: { wait?: number; keyPress?: boolean } = {}
) {
  return new Promise<void>(async (resolve) => {
    const message = chalk.bold(` KILT DISTILLERY CLI - ${chalk.reset(msg)}`)
    console.clear()
    if (!keyPress) {
      console.log(message)
      return setTimeout(resolve, wait)
    }

    await inquirer.prompt({
      //@ts-ignore
      name: 'key',
      type: 'press-to-continue',
      message,
      anyKey: true,
    })

    resolve()
  })
}

export async function mainMenu() {
  return (
    await prompt({
      type: 'list',
      name: 'action',
      message: 'select action',
      choices: [
        { name: 'create project from recipe', value: 'createProject' },
        { name: 'setup Claimer test credential', value: 'setupClaimer' },
        { name: 'setup Identity assets', value: 'setupIdentity' },
        { name: 'exit', value: 'exitCLI' },
      ],
    })
  ).action
}

export async function getMnemonic() {
  return (
    await prompt({
      type: 'input',
      name: 'mnemonic',
      message: `enter mnemonic\n${chalk.cyan('❯')}`,
      validate: (mnemonic) => mnemonicValidate(mnemonic) || 'invalid mnemonic',
    })
  ).mnemonic
}

export async function useExisting() {
  return (
    (
      await prompt({
        type: 'list',
        name: 'method',
        message: 'mnemonic',
        choices: [
          { name: 'use an existing mnemonic', value: 'existing' },
          { name: 'generate a new mnemonic', value: 'generate' },
        ],
      })
    ).method === 'existing'
  )
}

export async function getNetwork() {
  return (
    await prompt({
      type: 'list',
      name: 'network',
      message: 'select network',
      choices: [
        {
          name: 'peregrine testnet',
          value: 'wss://peregrine.kilt.io/parachain-public-ws',
        },
        {
          name: 'Spirit mainnet',
          value: 'wss://spiritnet.api.onfinality.io/public-ws',
        },
      ],
    })
  ).network
}

export async function getOrigin() {
  return (
    await prompt({
      type: 'input',
      name: 'origin',
      message: `enter origin ${chalk.reset.gray(
        '(https://example.com || http://localhost:3000)'
      )}\n${chalk.cyan('❯')}`,
      validate: (origin) =>
        origin.startsWith('http://localhost:') ||
        validUrl.isUri(origin) ||
        'invalid origin',
    })
  ).origin
}

export async function getRecipeProject() {
  const { project } = await prompt({
    type: 'list',
    name: 'project',
    message: 'select project',
    choices: [
      ...projects.map(({ name }, value) => ({ name, value })),
      { name: 'Cancel', value: 'cancel' },
    ],
  })

  if (project === 'cancel') {
    return null
  }

  return projects[project]
}

export async function getJWTExpiry() {
  return (
    await prompt({
      type: 'input',
      name: 'expiry',
      message:
        'how long should JWT be valid units of time? Example, 1 day or 2 hours:',
    })
  ).expiry
}

export async function getJWTRenewal() {
  return (
    (
      await prompt({
        type: 'list',
        name: 'renew',
        message: 'auto renew the JWT?',
        choices: [
          { name: 'yes', value: 'true' },
          { name: 'no', value: 'false' },
        ],
      })
    ).renew === 'true'
  )
}

export async function getDappName() {
  return (
    await prompt({
      type: 'input',
      name: 'dappName',
      message: "what's the dapp's name?",
    })
  ).dappName
}

export async function getClaimDetails(object: {
  [x: string]: { $ref?: string; type?: InstanceType; format?: string }
}) {
  const question = Object.keys(object).map((val) => ({
    type: 'input',
    name: `${val}`,
    message: `Please enter claim details ${val}?`,
  }))
  return inquirer.prompt(question)
}

export async function createTestCredentials() {
  return (
    (
      await prompt({
        type: 'list',
        name: 'renew',
        message: 'Create a test Claimer w/Credential?',
        choices: [
          { name: 'yes', value: 'true' },
          { name: 'no', value: 'false' },
        ],
      })
    ).renew === 'true'
  )
}
