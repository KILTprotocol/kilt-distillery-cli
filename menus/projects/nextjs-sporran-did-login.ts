import {randomAsHex} from '@polkadot/util-crypto'
import {getDappName, getJWTExpiry, getJWTRenewal, getNetwork, status} from '../_prompts'
import * as fs from 'fs-extra'
import {exec} from 'child_process'

export default async function () {
  const network = await getNetwork()
  await status('...generating JWT secret')
  const dappName = await getDappName()
  const jwtSecret = randomAsHex(16)
  const expiry = await getJWTExpiry()
  const renew = await getJWTRenewal()

  let dotenv = ''
  dotenv += `WSS_ADDRESS=${network}\n`
  dotenv += `JWT_SECRET=${jwtSecret}\n`
  dotenv += `JWT_EXPIRY="${expiry}"\n`
  dotenv += `JWT_RENEW=${renew}`

  status('creating files...')
  fs.writeFileSync(`${process.cwd()}/${dappName}/.env`, dotenv)

  status('initializing project...')
  process.chdir(dappName)
  exec('yarn init -y', () => {
    status('installing dependencies...')
    exec('yarn install', () => {
      status('building...')
      exec('npm run build', () => {
        status('start project with: npm run start')
        process.exit()
      })
    })
  })
}
