import web3Login from './web3-login'
import certifiedProof from './certified-proof'
import proofCheck from './proof-check'

export default [
  {
    name: 'web3 login',
    repo: 'KILTprotocol/web3-login-demo',
    create: web3Login,
  },
  {
    name: 'certified proof',
    repo: 'KILTprotocol/CertifiedProof',
    create: certifiedProof,
  },
  {
    name: 'proof check',
    repo: 'KILTprotocol/ProofCheck',
    create: proofCheck,
  },
]
