## Quickstart
#
### Install

Pull or download the code and run:
```bash
npm install
# or 
yarn install
```

### Setup
#
Create a .env file at the root of your project. Add the following.

```
# testnet or mainnet wss node
WSS_ADDRESS=wss://peregrine.kilt.io

# random secret to generate JWT
JWT_SECRET=134f09fjqw4riu_a34530faj

# set to false to never expire, 1h, 7d, 1m, 1y
JWT_EXPIRY=1d

# if true JWT renews every call, extending expiry and user's session
JWT_RENEW=true
```

### Run It
#

Run the dev server. 

```bash
npm run dev
# or
yarn dev
```
Note you can't reach the `/api/secret` or `/member/secret` routes prior to logging in.


### Authorizing Content
#

import the user hook and use the user to conditionally display your content. For this demo the user is just a DID URI string. The user has three states
- undefined (has not yet attempted login)
- null (has attempted and failed to login)
- string (the DID URI - login is successfull)


```javascript
import useUser from '../hooks/user'

export default function Home() {
  const { user } = useUser()

  return (
    {user === undefined ? (
      <h3>loading</h3>
    ) : !!user ? (
      <h3>Hi: {user}</h3>
    ) : (
      <h3>Hi guest</h3>
    )}
  )
}
```

You can import `login` and `logout` functions from the user hook as well. 

```javascript
import useUser from '../hooks/user'

export default function Home() {
  const { user, login, logout } = useUser()

  return (
    {user ? (
      <>
        <h3>Hi! {user}</h3> 
        <button onClick={logout}>logout</button>
      </>
    ) : (
      <>  
        <h3>unauthorized!</h3>
        <button onClick={login}>please login</button>
      </>
    )}
  )
}
```

### Middleware Authorization
#

You can protect page routes entirely using middleware. In the member folder note the _middleware.js file. This will protect all sub-routes from unauthorized access

```javascript
export function middleware(req) {
  // format the token for the parser
  const token = `token=${req.cookies.token}`

  // get user
  const user = getUser(token)

  if (!user) {
    // if user isn't logged in redirect 
    return NextResponse.redirect('/')

    // or you can throw 
    //return new NextResponse('unauthorized')
  }
}
```

### API Authorization
#

To protect your API calls from anauthorized access use the ```protectRoute``` helper. The function will throw if the user is unauthorized.

```javascript
import { protectRoute } from "../../utils/api"

export default function handler(req, res) {
  protectRoute(req, res)
  .then(() => res.status(200).send('top secret message'))
  .catch(() => res.status(401).send('unauthorized'))
}
```


