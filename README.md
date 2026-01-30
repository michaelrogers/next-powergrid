# Power Grid - Recharged

A digital implementation of the classic board game **Power Grid** built with Next.js, React, and TypeScript.

## Project Overview

Power Grid is a strategic economic and energy trading board game where players compete to build and manage power plants, acquire fuel, and supply electricity to cities. This implementation provides a full digital gaming experience with both **multiplayer (2-6 players)** and **solo mode with AI robots**.

## Game Features

- **1-Player Solo Mode** - Challenge AI robots with three difficulty levels
- **Multiplayer Modes** - Play with 2-6 human players
- **AI Robot System** - Three difficulty levels (Easy, Medium, Hard) with distinct strategies
- **Interactive Game Maps** - USA, Germany, and France with cities and power networks
- **Full Game Phases** - Auctions, Fuel Markets, City Building, Power Delivery
- **Real-time State Management** - React Context-based centralized game state

## Architecture

### Core Structure

- **`src/types/game.ts`** - TypeScript definitions for all game entities
- **`src/lib/gameEngine.ts`** - Core game rules and calculations
- **`src/lib/robotAI.ts`** - AI decision-making system
- **`src/lib/mapData.ts`** - Map definitions (USA, Germany, France) with cities and regions
- **`src/contexts/GameContext.tsx`** - Global game state management using React Context + useReducer
- **`src/components/GameMap.tsx`** - Interactive SVG map component (NEW)
- **`src/components/`** - React UI components (GameBoard, Auction, RobotBadge, etc.)

### Key Game Mechanics

1. **Auction Phase** - Players bid on available power plants
2. **Fuel Market** - Buy fuel (coal, oil, garbage, nuclear) at market prices
3. **City Building** - Connect cities to power plants via interactive networks
4. **Power Delivery** - Supply electricity and earn money
5. **Bureaucracy** - Discard obsolete power plants, adjust market

### Interactive Game Maps

Three full power grid maps with accurate regional layouts:

**🇺🇸 United States Map**
- 4 regions: Northeast, Midwest, South, West
- 17 major cities with realistic power line connections
- Coast-to-coast network building

**🇩🇪 Germany Map**
- 4 regions: North Germany, West Germany, East Germany, South Germany
- 11 major cities including Berlin, Munich, Frankfurt
- Dense central European network

**🇫🇷 France Map**
- 5 regions: Paris, Nord, Est, Ouest, Midi
- 13 major cities across the country
- Regional connectivity spanning north to south

### Map Features

- **Interactive Cities** - Hover to see city names, click to build during city phase
- **Power Network Lines** - SVG connections showing how cities can be linked
- **Player Colors** - Cities displayed in player colors when owned
- **Dynamic Scaling** - Maps automatically scale to fill available space
- **Region Information** - Cost multipliers vary by region
- **Responsive Legend** - Shows player ownership and current status

### Robot AI System

The game includes a sophisticated AI robot system for solo play:

- **Three Difficulty Levels:**
  - 🟢 **Easy** - Conservative bidding, limited expansion
  - 🟡 **Medium** - Balanced strategy, moderate growth
  - 🔴 **Hard** - Aggressive bidding, rapid expansion, nuclear preference

- **AI Decision Making:**
  - Auction bidding based on plant value and strategy
  - Fuel purchasing with resource optimization
  - City placement following expansion strategy
  - Power delivery calculation

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to start playing.

### Build

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout with GameProvider
│   └── page.tsx           # Game setup & main page
├── components/            # React components
│   ├── GameBoard.tsx      # Main game interface
│   └── Auction.tsx        # Auction interface
├── contexts/              # State management
│   └── GameContext.tsx    # Game state & dispatch
├── lib/                   # Core game logic
│   └── gameEngine.ts      # Game rules & calculations
└── types/                 # TypeScript definitions
    └── game.ts            # Game entities & types
```

## Development Workflow

### Running Tests

```bash
npm run test
```

### Code Quality

ESLint is configured for code style consistency:

```bash
npm run lint
```

## Game Rules Summary

- **1-Player Solo Mode** - Challenge 1-5 AI robots at Easy/Medium/Hard difficulty
- **2-6 Players Multiplayer** - Compete with human players
- **Players start with $50** and must bid for power plants
- **Power plants range from 10-40 MW** with different fuel types
- **Max 3 cities per region** per player
- **8 rounds** typical game length
- Winner = Most cities supplied at game end

## Using Solo Mode (1-Player with Robots)

1. Start the game and select **"Solo (Robots)"** mode
2. Choose number of robots: 1-5
3. Select robot difficulty:
   - **Easy** - Good for learning, robots play conservatively
   - **Medium** - Balanced challenge, robots use mixed strategies
   - **Hard** - Maximum challenge, robots play aggressively
4. The game creates 1 human player + N robot players
5. Play your turns normally; robots act automatically
6. Robot actions are logged for review

## Component Development

### Adding New Components

1. Create component in `src/components/YourComponent.tsx` with 'use client'
2. Use `useGame()` hook to access state:
   ```tsx
   const { state, dispatch } = useGame();
   ```
3. Import and use in layout

### Extending Game Logic

1. Add new methods to `PowerGridEngine` class in `src/lib/gameEngine.ts`
2. Update game actions in `GameContext.tsx` reducer
3. Add type definitions in `src/types/game.ts`

### Improving Robot AI

The robot AI can be enhanced by:

1. **Adding new strategies** to `RobotAI.STRATEGIES` with custom parameters
2. **Tuning aggressiveness** - Adjust values 0-1 for bidding behavior
3. **Modifying fuel preferences** - Change preferred fuel types per difficulty
4. **Enhancing decision logic** - Improve plant evaluation and city selection in `RobotAI` methods

Example: Making robots prefer garbage fuel:
```ts
[RobotDifficulty.HARD]: {
  aggressiveness: 0.9,
  fuelPreference: FuelType.GARBAGE, // Changed from NUCLEAR
  expansionRate: 0.8,
},
```
## Next Steps

- [x] Add 1-player solo mode with robot players
- [ ] Implement multiplayer networking (WebSockets)
- [ ] Create game replay/history functionality
- [ ] Add persistence (localStorage/database)
- [ ] Implement different maps and difficulty levels
- [ ] Add sound effects and animations
- [ ] Enhance robot AI with learning/adaptation
- [ ] Add game statistics and leaderboards

Based on Power Grid by Friedemann Friese, published by Rio Grande Games.
