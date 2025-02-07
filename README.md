# Price Pulse Bot 🤖💹

**Price Pulse Bot** is a smart Telegram bot that helps you get real-time cryptocurrency and fiat prices every 30 minutes. The bot uses the Nobitex API to receive prices and sends them based on users' preferences.

## Key Features 🌟

- **Multi-currency Support:** The bot supports multiple currencies such as USDT/IRT and BTC/IRT.
- **Automatically Send Prices:** Sends updated prices to users every 30 minutes.
- **Easy Management:** Users can easily select or cancel the currencies they want.
- **Price formatting:** Prices are displayed formatted according to the user's local currency and language.

## How to get started 🛠️

### Prerequisites

- [Node.js](https://nodejs.org/) (version 16 or higher)
- [NestJS](https://nestjs.com/)
- A Telegram bot token from [BotFather](https://core.telegram.org/bots#botfather)

### Installation and Setup

1. **Clone the repository:**

```bash
git clone https://github.com/your-username/price-pulse-bot.git
cd price-pulse-bot
```

2. **Install dependencies:**

```bash
npm install
```

3. **Set environment variables:**

Create a `.env` file in the root of your project and put your Telegram bot token in it:

```env
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
```

4. **Run the project:**

```bash
npm run start
```

Or to run in development mode:

```bash
npm run start:dev
```

## How to use the bot 🤖

1. **Start working with the bot:**

In Telegram, find the bot and send the `/start` command. The bot will send you a welcome message.

2. **Subscribe to the desired currencies:**

Send the `/subscribe` command and select the currencies you want from the displayed menu. After selecting, click the **Confirm** button.

3. **Unsubscribe:**

If you no longer want to receive prices, send the `/unsubscribe` command.

4. **Get prices:**

The bot will send you updated prices every 30 minutes.

## Donate 💖

If you like this project and want to support its development and maintenance, you can donate through one of the following methods:

### Donate methods

- [**Zarinpal**](https://github.com/sponsors/Hossein-i)

- **The Open Network (TON):**

```text
UQC6DUtxFcqhTYvUSFmnmLpb-MI6-41RY4ECeZgY7hvkLGJI
```

### Why support this project?

- **Continuous development:** Your support helps us to continue developing and improving this project.
- **Feature enhancements:** With your support, we can add new and more exciting features to the bot.
- **Better Support:** Financial support allows us to provide better support to our users.

Any donation, no matter how small, is very valuable to us and motivates us to continue working. 🙏

## Contribute to the project 🤝

If you want to contribute to the development of this project, follow these steps:

1. Fork the repository.
2. Create a new branch:

```bash
git checkout -b feature/your-feature-name
```

3. Apply your changes and commit:

```bash
git commit -m "Add your commit message here"
```

4. Push your changes to the forked repository:

```bash
git push origin feature/your-feature-name
```

5. Create a Pull Request.

## License 📜

This project is released under the [MIT](LICENSE) license.
