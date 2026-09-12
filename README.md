# PTCG Sandbox

Inspired by [xxmichaellong/ptcg-sim](https://github.com/xxmichaellong/ptcg-sim).

This is mostly a proof-of-concept, rather than a finished product.

### Running local multiplayer

The repo has a built-in multiplayer function using untun, a Cloudflare tunneler.

1. Clone the repo
2. Run `pnpm install` to make sure all dependencies are present.
3. Run `pnpm share` and paste the given link or QR code to let others connect via the tunnel.

Running `pnpm start` only starts the server locally. It does not establish a tunnel. `pnpm share` starts the server and establishes the tunnel. There is no need to run `pnpm start` before running `pnpm share`.

## Note

There is a fallback password for admin.socket.io functionality. This is a vulnerability for real deployment, but is safe for local testing and play.  
See comment in `server/src/server.js`.

To close this minor vulnerability:

1. Create a file in root called `.env`
2. Paste this blank template:
   ```
   ADMIN_UI_USERNAME=
   ADMIN_UI_PASSWORD_HASH=
   CLIENT_ORIGIN=
   PORT=
   ```
3. In the `server/` directory (`cd server`), run `node -e "console.log(require('bcryptjs').hashSync('yourpassword', 10))"` and replace `yourpassword` with a password of choice.
4. Copy and paste the resulting hash in the `ADMIN_UI_PASSWORD_HASH=` field.
5. Fill in the remaining fields.
6. Make sure to set the CLIENT_ORIGIN port to the PORT value. For example:

```
CLIENT_ORIGIN=http://localhost:3000
PORT=3000
```
