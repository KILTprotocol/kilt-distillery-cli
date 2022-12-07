import { ConfigService, connect} from "@kiltprotocol/sdk-js";
import { cryptoWaitReady } from "@polkadot/util-crypto";


export async function getApi() {
    await cryptoWaitReady();
    if(ConfigService.isSet('api')) return ConfigService.get('api')
    return connect(process.env.WSS_ADDRESS)
}