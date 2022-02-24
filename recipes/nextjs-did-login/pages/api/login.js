
import { clearCookie, isSignatureValid, createJWT, setCookie, randomChallenge, getCookieData } from '../../utils/api';

const handlers = {
  GET(req, res) {  
    // return a random string for user to sign
    const challenge = randomChallenge()

    // store it in httpOnly for safe comparison
    const token = createJWT(challenge)
    setCookie(res, { name: 'challenge', data: token })

    // send back to user to form signature
    res.status(200).end(challenge)
  },
  async POST(req, res) {
    // get the raw input and signed output from client
    const { output } = JSON.parse(req.body)
    const cookie = req.headers.cookie || ''
    const input = getCookieData({ name: 'challenge', cookie })

    // get the validity state of the signature attempt
    const valid = await isSignatureValid({ input, output })

    if (!valid) {
      // if invalid clear httpOnly cookie & send 401
      clearCookie(res, { name: 'token'})
      res.status(401).send('')
    } else {
      // if valid create JWT from DID, set httpOnly cookie, return 200 with DID
      const { did } = output
      const token = createJWT(did)
      setCookie(res, { name: 'token', data: token })
      res.status(200).send(did)
    }
  }
}

export default function handler(req, res) {
  // send call to method handlers above
  handlers[req.method](req, res)
}
