
# 易火 ETor (CF) Translations for Torchlight Infinite (Loot Tracker, etc.)
[Donate @ Ko-fi](https://ko-fi.com/deafwave)

[Releases](https://github.com/ChandlerFerry/etor-translations/releases)

[FAQ](./docs/etor-faq.MD)

### Installation
1. Go to [Releases](https://github.com/ChandlerFerry/etor-translations/releases)
2. Download and unzip the latest release.
3. Run the executable.

Releases are immutable, and automated via [GitHub Actions](https://github.com/ChandlerFerry/etor-translations/actions) for security.

Releases are built from `$PLUGINSDIR/app-64.7z` inside the official `易火-ETor Setup 1.0.6.exe` (SHA-256 `d76bee60ff136100c027ebfb18e7c141db64b6d6739c2024f25019f362ca41df`); the build refuses any other file (see `SOURCE_SHA256` in [release.ts](./src/scripts/release.ts)). The app's shell-command and log-file IPC is restricted in the main process by [ipc-guard.cjs](./src/ipc-guard.cjs).

## Showcase

<details>
<summary><b>Click to see screenshots of what ETOR is capable of</b></summary>

| Overview | Items |
|---|---|
| ![Overview](./docs/main.png)| ![Items](./docs/items.png)|
| **History** | **Price Fluctuation** |
| ![History](./docs/history.png)| ![Price Fluctuation](./docs/pricedatabase.png)
| **Leaderboard** | **Mini Window** |
| ![Leaderboard](./docs/strategy-leaderboard.png)| ![Mini Window](./docs/mini.png) |

</details>

## Other Guides (WIP)
- [Carino Step-By-Step Build Guide](./docs/guides/carino.MD)
- [Tiered Strategies](./docs/guides/strategies_tiered.MD)
- [Pet Auto Switch Groups](./docs/guides/pet_auto_switch_groups.MD)
