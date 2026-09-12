# PTCG Sandbox

Inspired by [xxmichaellong/ptcg-sim](https://github.com/xxmichaellong/ptcg-sim).

This is mostly a proof-of-concept, rather than a finished product.

### Running local multiplayer

The repo has a built-in multiplayer function using untun, a Cloudflare tunneler.

1. Clone the repo
2. Run `pnpm install` to make sure all dependencies are present.
3. Run `pnpm share` and paste the given link or QR code to let others connect via the tunnel.

Running `pnpm start` only starts the server locally. It does not establish a tunnel. `pnpm share` starts the server and establishes the tunnel. There is no need to run `pnpm start` before running `pnpm share`.
