import { clearCookie, setCookie, createJWT, getCookieData } from '../../utilities/auth';
import { ConfigService, Did } from '@kiltprotocol/sdk-js'
import { getApi } from "../../utilities/connection";



export default async function handler(req, res) {
  // load and parse the cookie
  const cookie = req.headers.cookie || ''

  // get the user from cookie
  const user = getCookieData({ name: 'token', cookie }) // did-uri from the extension

  await getApi()

  if (!user) {
    // if null ensure cookie is cleared & 401
    clearCookie(res, { name: 'token'})
    res.status(401).send('')
  } else {
    // if user and renew reset the token
    const renew = process.env.JWT_RENEW
    const api = ConfigService.get('api');
    if (renew) {
      const newToken = createJWT(user)
      setCookie(res, { name: 'token', data: newToken })
    }

    const web3Name = await api.query.web3Names.names(user);

    //console.log(await api.query.did.did())

    //.queryWeb3NameForDid(user)
    // send user and 200
    res.status(200).send(web3Name ? web3Name : user)
  }
}
