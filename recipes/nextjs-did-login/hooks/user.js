import { useState, useEffect } from 'react';
import useSporran from './sporran';

let _user

export default function useUser() {
  const [ user, setUser ] = useState(_user);
  const { sporran } = useSporran();
  
  useEffect(() => {
    (async () => {
      if (!!user) return
      const result = await (await fetch('/api/user')).text()
      _user = !!result ? result : null
      setUser(_user)
    })()
  }, []);

  async function logout() {
    const loggedOut = (await fetch('/api/logout')).ok
    if (!loggedOut) return
    _user = null
     setUser(null)
  }

  async function login() {
    const input = await (await fetch('/api/login')).text()
    const output = await sporran.signWithDid(input)
    const result = await (await fetch('/api/login', { 
      method: 'POST', 
      headers: { ContentType: 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ output })
    })).text()
    _user = !!result ? result : null
    setUser(_user)
  }

  return {
    user, 
    login, 
    logout,
  }
}