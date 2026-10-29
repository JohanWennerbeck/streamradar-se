# StreamRadar SE 🇸🇪

A 10-foot Smart TV application and **TizenBrew module** for Samsung TVs (and desktop browsers) that cross-checks real-time Swedish streaming availability across **Netflix**, **Disney+**, **Max**, **Amazon Prime Video**, and **SVT Play**.

---

## Features

- **🇸🇪 Sweden (`SE`) Cross-Checking:** Instant availability check powered directly by JustWatch's public GraphQL API (zero API keys required).
- **🔥 Trending Titles:** Live popular movies and series across your active subscriptions in Sweden.
- **📅 Coming Soon & New (2026):** Track upcoming releases with release dates and service tags.
- **🔍 Instant Search:** Search any title and see where to stream it, or find the cheapest digital rental in SEK (SF Anytime, Apple TV, Rakuten, etc.).
- **📺 1-Click Launch on Samsung Tizen TVs:** Jump directly into installed TV apps (**Netflix**, **Disney+**, **Max**, **Prime Video**, **SVT Play**) or launch trailers directly in **TizenTube**.
- **🎮 10-Foot Spatial D-Pad Navigation:** Built for TV remotes with high-contrast Neo QLED / OLED focus indicators.
  - **D-Pad:** Move focus
  - **OK / Enter:** Open title details / Launch app
  - **Back / Esc:** Dismiss modal or clear search
  - **Color Keys:** Quick-toggle filters (Red: Netflix, Green: Disney+, Yellow: Max, Blue: Prime Video)

---

## How to Install on Samsung Smart TVs (via TizenBrew)

1. Open **TizenBrew** on your TV.
2. Press the **Green** button on your remote (or open the **Module Manager**).
3. Select **Add Module** (`+`).
4. Type:
   ```text
   gh/JohanWennerbeck/streamradar-se
   ```
5. Press **Add**. **StreamRadar SE** will appear on your TV screen!

---

## Local Development (Browser Preview)

```bash
# Start local static server
npm start
# Open http://localhost:8088 in your browser
```

---

## License

MIT © [Johan Wennerbeck](https://github.com/JohanWennerbeck)
