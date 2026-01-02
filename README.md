# StretchBreak

A React-based web application that helps you maximize your vacation time by strategically planning holidays around public holidays. The app includes AI-powered features for intelligent suggestions, natural language input, and an interactive chat assistant.

**GitHub Repository:** [https://github.com/adefemi171/StretchBreak](https://github.com/adefemi171/StretchBreak)

## Features

- 📅 **Public Holidays Display**: View public holidays for any country and year
- 🎯 **Smart Planning Algorithm**: Automatically suggests optimal vacation periods
- 🤖 **AI-Powered Suggestions**: Get intelligent recommendations from OpenAI
- 💬 **Natural Language Input**: Describe your vacation plans in plain English
- 💬 **Chat Assistant**: Interactive AI assistant to help plan holidays
- 📊 **Statistics Dashboard**: Track vacation days used and efficiency
- 💾 **Plan Management**: Save, edit, and manage multiple holiday plans
- 📈 **Preference Learning**: AI learns from your past plans

## Getting Started

### Prerequisites

- Node.js 20+ (recommended)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/adefemi171/StretchBreak.git
cd StretchBreak
```

2. Install dependencies:
```bash
npm install
```

3. (Optional) Set up OpenAI API key for AI features:
   
   **For Local Development:**
   - Install Netlify CLI: `npm install -g netlify-cli`
   - Run `netlify dev` instead of `npm run dev` to start the development server with functions
   - Set environment variable: `netlify env:set OPENAI_API_KEY your_api_key_here`
   
   **For Production (Netlify):**
   - Go to your Netlify site dashboard
   - Navigate to Site settings → Environment variables
   - Add `OPENAI_API_KEY` with your OpenAI API key value
   - Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)
   
   **Note:** The API key is now stored server-side in Netlify Functions, so it won't be exposed in the browser.

4. Start the development server:
```bash
npm run dev
```

5. Open your browser and navigate to the URL shown in the terminal (usually `http://localhost:5173`)

## Usage

1. **Select Country and Year**: Choose your country and the year you want to plan for
2. **View Suggestions**: The app will automatically suggest optimal vacation periods
3. **Use AI Features** (if API key is configured):
   - Enter natural language requests like "I want a week off in summer"
   - Chat with the AI assistant for help
4. **Select Vacation Days**: Click on calendar days to select your vacation dates
5. **View Statistics**: See how many vacation days you're using and your efficiency
6. **Save Plans**: Save your plans for future reference

## Technology Stack

- **React 19** with TypeScript
- **Vite** for build tooling
- **date-fns** for date utilities
- **OpenAI API** for AI features
- **date.nager.at API** for public holidays data

## Project Structure

```
StretchBreak/
├── src/
│   ├── components/      # React components
│   ├── services/        # API and storage services
│   ├── utils/           # Utility functions and types
│   ├── hooks/           # Custom React hooks
│   └── App.tsx          # Main application component
├── public/              # Static assets
└── package.json         # Dependencies
```

## Features in Detail

### Planning Algorithm
The app analyzes public holidays and weekends to find "bridge" opportunities. For example:
- If a holiday falls on Thursday-Friday, it suggests taking Monday-Wednesday off
- This gives you 5 days off using only 3 vacation days (2.67x efficiency!)

### AI Features
- **Natural Language Processing**: Parse requests like "week off in summer" or "plan around Christmas"
- **Smart Suggestions**: AI analyzes patterns and preferences to suggest optimal periods
- **Chat Assistant**: Get help planning holidays through conversational interface
- **Preference Learning**: The system learns from your past plans to improve suggestions

## Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## License

CC-BY-NC-4.0

