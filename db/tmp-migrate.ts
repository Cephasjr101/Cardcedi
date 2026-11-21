
import { env } from '../api/lib/env'
import { verifySessionToken } from '../api/kimi/session'
async function main() {
  console.log('secret from env:', JSON.stringify(env.appSecret))
  const tok = process.argv[2]
  console.log('verify:', await verifySessionToken(tok))
}
main().then(() => process.exit(0)).catch((e) => { console.error(e.message); process.exit(1) })
