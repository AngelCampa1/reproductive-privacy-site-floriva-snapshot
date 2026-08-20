# Third-party licenses

This file covers third-party material that is **redistributed inside this
repository**. Packages installed from a registry at build time are not
redistributed here; their licenses live in their own packages and are resolved
by `pnpm install` from `pnpm-lock.yaml`.

## Fonts

The site self-hosts four variable font files and loads no fonts from a third-party
host. Because the font binaries are committed, the SIL Open Font License 1.1
requires the copyright notice and license to travel with them. Full texts are in
[`public/fonts/licenses/`](public/fonts/licenses/).

| Family | Files in `public/fonts/` | Version | License | Text |
|---|---|---|---|---|
| Inter Tight | `inter-tight-var.woff2` | 5.2.7 | OFL-1.1 | [OFL-Inter-Tight.txt](public/fonts/licenses/OFL-Inter-Tight.txt) |
| JetBrains Mono | `jetbrains-mono-var.woff2` | 5.2.8 | OFL-1.1 | [OFL-JetBrains-Mono.txt](public/fonts/licenses/OFL-JetBrains-Mono.txt) |
| Newsreader | `newsreader-var.woff2`, `newsreader-italic-var.woff2` | 5.2.10 | OFL-1.1 | [OFL-Newsreader.txt](public/fonts/licenses/OFL-Newsreader.txt) |

Copyright holders, per the notices above:

- Inter Tight — Copyright 2022 The Inter Project Authors
- JetBrains Mono — Copyright 2020 The JetBrains Mono Project Authors
- Newsreader — Copyright 2020 The Newsreader Project Authors

Both Newsreader faces are covered by the single Newsreader license, which is why
four font files map to three license texts.

The `.woff2` files are subsets built from the `@fontsource-variable/*` packages;
the versions above are the package versions they were built from.

## Cited sources in content

`content/` and `docs/research/` quote and link to third-party material —
regulatory filings, court records, published privacy policies, and news
reporting. Nothing there is redistributed wholesale: claims are quoted or
paraphrased and attributed in place, with the source list maintained in
[`docs/research/04-sources.md`](docs/research/04-sources.md) and re-resolved by
`pnpm verify:sources`.

## Everything else

See [LICENSE](LICENSE).
