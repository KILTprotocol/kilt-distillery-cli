import { prompt, status } from "./_utilities.js"
import mainMenu from "./main-menu.js"
import chalk from "chalk"
import { randomAsHex } from "@polkadot/util-crypto"
import fs from 'fs-extra'
import recipes from "../recipes/index.js"
import { exec } from "child_process"

export default async function () {
  let message = ''

  const { project } = await prompt({
    type: 'list',
    name: 'project',
    message: 'select project',
    choices: [
      { name: 'NextJS JWT Session w/DID Signature', value: 'nextjs-did-login' },
      { name: 'NextJS JWT Session w/Credential Verification', value: 'nextjs-verify' },
      { name: 'Cancel', value: 'cancel' },
    ]
  })

  if (project === 'cancel') return false
  if (project === 'nextjs-verify') {
    message = 'NextJS Credential Sign-In Recipe Coming Soon!\n'
    message += chalk.reset.gray('... press any key to return to main menu')
    await status(msg, { keyPress: true })
    return mainMenu()
  }

  const { network } = await prompt({
    type: 'list',
    name: 'network',
    message: 'select network',
    choices: [
      { name: 'testnet', value: 'wss://peregrine.kilt.io/parachain-public-ws' },
      { name: 'mainnet', value: 'wss://spiritnet.api.onfinality.io/public-ws' },
    ]
  })

  await status('...generating JWT secret')
  const jwtSecret = randomAsHex(16)

  const { expiry } = await prompt({
    type: 'input',
    name: 'expiry',
    message: 'how long should JWT be valid?'
  })

  const { renew } = await prompt({
    type: 'list',
    name: 'renew',
    message: 'auto renew the JWT?',
    choices: [
      { name: 'yes', value: 'true' },
      { name: 'no', value: 'false' },
    ]
  })

  const dotenv = `WSS_ADDRESS=${network}\nJWT_SECRET=${jwtSecret}\nJWT_EXPIRY="${expiry}"\nJWT_RENEW=${renew}`

  // include fs-extra package
  status('creating files...')
  recipes[project].forEach(file => {
    fs.ensureFileSync(`${process.cwd()}/${file.path}`)
    fs.writeFileSync(`${process.cwd()}/${file.path}`, file.code)
  })
  fs.writeFileSync(`${process.cwd()}/.env`, dotenv)

  status('initializing project...')
  exec("yarn init -y", () => {
    status('installing dependencies...')
    exec('yarn install', () => {
      status('building...')
      exec('npm run build', () => {
        status('start project with: npm run start')
      })
    })
  });
}