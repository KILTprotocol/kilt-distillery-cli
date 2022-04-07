import { status, getJWTExpiry, getJWTRenewal, getDappName } from "../_prompts.js"
import setupVerifier from "../setup-verifier.js"
import { randomAsHex } from "@polkadot/util-crypto"
import { nextJsCredentialLogin } from "../../recipes/index.js"
import fs from 'fs-extra'
import { exec } from "child_process"

export default async function () {
  const dappName = await getDappName()
  const jwtSecret = randomAsHex(16)
  const jwtExpiry = await getJWTExpiry()
  const renewJwt = await getJWTRenewal()
  const { 
    origin,
    network,
    mnemonic,
    address,
    didUri,
    didConfig, 
  } = await setupVerifier({ returnAssets: true })

  let dotenv = ''
  dotenv += `DAPP_NAME="${dappName}"\n`
  dotenv += `ORIGIN=${origin}\n`
  dotenv += `WSS_ADDRESS=${network}\n`
  dotenv += `VERIFIER_MNEMONIC="${mnemonic}"\n`
  dotenv += `VERIFIER_ADDRESS=${address}\n`
  dotenv += `VERIFIER_DID_URI=${didUri}\n`
  dotenv += `JWT_SECRET=${jwtSecret}\n`
  dotenv += `JWT_EXPIRY=${jwtExpiry}\n`
  dotenv += `JWT_RENEW=${renewJwt ? 'true' : 'false'}`

  status('creating files...')
  nextJsCredentialLogin.forEach(file => {
    fs.ensureFileSync(`${process.cwd()}/${dappName}/${file.path}`)
    fs.writeFileSync(`${process.cwd()}/${dappName}/${file.path}`, file.code)
  })
  fs.writeFileSync(`${process.cwd()}/${dappName}/.env`, dotenv)
  fs.writeFileSync(`${process.cwd()}/${dappName}/public/didConfiguration.json`, JSON.stringify(didConfig, null, 2))
  
  status('initializing project...')
  process.chdir(dappName)
  exec("npm init -y", () => {
    status('installing dependencies...')
    exec('npm install', () => {
      status('building...')
      exec('npm run build', () => {
        status('start project with: npm run start')
        process.exit()
      })
    })
  })
}
