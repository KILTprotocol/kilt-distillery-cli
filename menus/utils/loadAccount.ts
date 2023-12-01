import { Utils, KiltKeyringPair } from '@kiltprotocol/sdk-js'
import { status } from '../_prompts'


export async function loadAccount({
  seed,
}: {
  seed: string;
}): Promise<KiltKeyringPair> {
  await status('loading account...')
  return Utils.Crypto.makeKeypairFromUri(seed)
}
