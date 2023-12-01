import { KiltKeyringPair, ConfigService } from '@kiltprotocol/sdk-js'
import { status } from '../_prompts'
import chalk from 'chalk'

export async function loadBalance(account: KiltKeyringPair, testnet: any) {
  const api = ConfigService.get('api')

  let balance = parseInt(
    (await api.query.system.account(account.address)).data.free.toString()
  )
  if (balance < 3) {
    const message = testnet
      ? chalk.cyan(
        `get testnet tokens to continue => https://faucet.peregrine.kilt.io/?${account.address}`
      )
      : chalk.red(
        `balance too low... to continue send 3 or more KILT to: ${account.address}`
      )

    await status(message)
    while (balance < 3) {
      balance = parseInt(
        (await api.query.system.account(account.address)).data.free.toString()
      )
      await new Promise((r) => setTimeout(r, 2000))
    }
  }
}
