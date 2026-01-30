# Power Grid Copilot Instructions

## Project Context

This is a **Next.js + TypeScript digital implementation of the Power Grid board game** (Rio Grande Games) with **1-player solo mode using AI robots** and **interactive game board maps**. The application uses React Context for state management and Tailwind CSS for styling. Game logic is enforced through a `PowerGridEngine` class, AI decisions through `RobotAI`, and the interactive map is rendered with SVG.

## Architecture Essentials

### State Management Pattern

The game uses React Context (`GameContext.tsx`) with a reducer pattern - **NOT Redux**. All game state flows through `dispatch()` actions:

```tsx
const { state, dispatch } = useGame(); // Only hook for accessing game state
dispatch({ type: 'PLACE_BID', payload: { playerId, amount } });
```

Key action types defined in `GameContext.tsx`:
- `INITIALIZE_GAME` - Start new game with players and map
- `PLACE_BID` - Auction phase
- `BUY_FUEL` - Fuel market phase
- `BUILD_CITY` - City development phase (triggers when building on map)
- `NEXT_PHASE` / `END_ROUND` - Phase transitions
- `ROBOT_TURN` - Trigger AI decision-making for robot players

### Type System

**All game entities must use types from `src/types/game.ts`**:
- `Player` - Individual player data with optional `isRobot` and `robotDifficulty` flags
- `PowerPlant` - Power generation units (number, power MW, fuelType, efficiency)
- `GameState` - Complete game state snapshot + `gameMap` for interactive map
- `GamePhase` enum - Defines 6 game phases (SETUP, AUCTION, FUEL_PURCHASE, etc.)
- `FuelType` enum - coal, oil, garbage, nuclear
- `GameConfig` - Includes `map` selection (string: 'usa', 'germany', 'france')

**Never use `any` type** - Always define interfaces. Use `Map<string, number>` for player city tracking.

### Game Logic Location

**`src/lib/gameEngine.ts`** contains all game rules:
- `calculateMaxPower(player)` - MW a player can produce
- `getMinimumBid(currentBid, hasValidBid)` - Auction bid floor
- `canBuildCity(player, region, availableCities)` - Validation (max 3 cities/region)
- `endAuction(auction, player)` - Award power plant, transfer money
- `createPowerPlants()` - Initialize market

**`src/lib/robotAI.ts`** contains AI decision logic:
- `decideBid(player, plant, currentBid, strategy)` - Calculate robot auction bid
- `decideFuelPurchase(player, gameState, strategy)` - Decide fuel purchases
- `decideCityBuilding(player, availableCities, strategy)` - Plan city expansion

**`src/lib/mapData.ts`** contains map definitions:
- `GameMap` interface - Regions, cities, connections structure
- `City` interface - Position (x, y %), name, region
- `USA_MAP`, `GERMANY_MAP`, `FRANCE_MAP` - Pre-defined maps
- `getAllCities()`, `getCitiesInRegion()` - Map query helpers
- `decideElectricityDelivery(player)` - Calculate power delivery

**`RobotDifficulty` enum defines three levels**:
- `EASY` (aggressiveness: 0.3) - Conservative bidder, limited expansion
- `MEDIUM` (aggressiveness: 0.6) - Balanced strategy, moderate expansion
- `HARD` (aggressiveness: 0.9) - Aggressive bidder, rapid expansion, nuclear preference

**Game logic MUST be testable and pure** - no side effects in engine or AI methods.

## Development Workflow

### Solo Mode (1-Player with Robots)

**Setup flow**:
1. Player selects "Solo (Robots)" mode in GameSetup
2. Chooses number of robots (1-5) and difficulty level
3. Game creates 1 human player (You) + N robot players
4. Players marked with `isRobot: true` and `robotDifficulty` level

**Robots are identified**:
- Named "Robot 1", "Robot 2", etc.
- Display with RobotBadge component showing difficulty icon
- GameBoard shows "1 Human + N Robots" summary

**Robot decision-making**:
- Hook into auction: When robot's turn, call `RobotAI.decideBid()`
- Fuel phase: Call `RobotAI.decideFuelPurchase()` for fuel purchases
- Build phase: Call `RobotAI.decideCityBuilding()` for city placement
- Dispatch `ROBOT_TURN` action to trigger automatic decisions

### Component Creation

**All interactive components need `'use client'` directive** since they use context hooks:

```tsx
'use client';
import { useGame } from '@/contexts/GameContext';

export default function AuctionPhase() {
  const { state, dispatch } = useGame();
  // Component code
}
```

**Component hierarchy**:
- `page.tsx` → Conditionally renders `GameSetup` or `GameBoard`
- `GameBoard.tsx` → Main game interface (grid layout)
- `Auction.tsx` → Auction interface (called by GameBoard when phase = AUCTION)

### Styling

- **Framework**: Tailwind CSS (utility-first)
- **Theme**: Dark mode (slate-900, slate-800) for game aesthetic
- **Pattern**: Use `className` with Tailwind utilities, no CSS files except `globals.css`
- **Responsive**: grid-cols-4 for main board layout

### Testing Game Logic

Separate game logic from components. Test `PowerGridEngine` methods independently:

```ts
const maxPower = PowerGridEngine.calculateMaxPower(player);
const canBuild = PowerGridEngine.canBuildCity(player, 'usa_east', 2);
```

## Common Patterns in This Codebase

### Map Usage for Dynamic Collections

Player cities stored as `Map<string, number>` (region → count):

```ts
player.cities.get('usa_east') // returns number or undefined
player.cities.set('usa_east', 3) // set value
Array.from(player.cities.values()).reduce((a,b) => a+b, 0) // total cities
```

### Fuel Resources

Fuel stored as `Record<FuelType, number>`:

```ts
player.resources = { coal: 5, oil: 2, garbage: 0, nuclear: 1 }
plant.fuelType = [FuelType.COAL, FuelType.OIL] // accepts multiple types
```

### Phase-Based Game Flow

Game progresses through `GamePhase` enum values. Components check `state.phase` to render conditionally:

```tsx
if (state.phase === GamePhase.AUCTION) return <Auction />;
if (state.phase === GamePhase.FUEL_PURCHASE) return <FuelMarket />;
```

## Interactive Map System

### Map Rendering
- **SVG-based rendering** - Scalable vector graphics for crisp map display
- **City visualization** - Interactive circles with hover tooltips
- **Power network lines** - Connections between cities shown as SVG lines
- **Player colors** - Cities colored by owner, gray when unowned

### Available Maps
1. **USA** - Northeast, Midwest, South, West regions (17 cities)
2. **Germany** - North, West, East, South regions (11 cities)
3. **France** - Nord, Paris, Est, Ouest, Midi regions (13 cities)

### Map Features
- **Hover interactions** - Shows city names on mouse over
- **City ownership** - Visual indication of which player owns each city
- **Selection mode** - Highlight selected cities during building phase
- **Responsive scaling** - Map scales to container size using SVG viewBox

## Critical Implementation Rules

1. **GameProvider wraps entire app** in `layout.tsx` - without it, `useGame()` throws error
2. **Player IDs are consistent** - formatted as `player_0`, `player_1`, etc. for indexing
3. **Immutability required** - Redux-style: always spread state objects, never mutate directly
4. **Type safety** - Catch errors early with strict TypeScript (no `any`, `!` sparsingly)
5. **Player money/cities validation** - Check funds before auction award, validate city limits before build
6. **Map data immutable** - Define maps as constants in `mapData.ts`, never modify at runtime

## Adding New Features

### Adding a Game Phase

1. Add enum value to `GamePhase` in `types/game.ts`
2. Add handler in `gameReducer()` switch in `GameContext.tsx`
3. Create component `src/components/Phase.tsx` with `'use client'`
4. Add conditional render in `GameBoard.tsx` or `page.tsx`
5. Implement phase logic in `PowerGridEngine` if needed

### Adding Game Actions

1. Define action type in `GameAction` union in `GameContext.tsx`
2. Add case to gameReducer switch statement
3. Dispatch from component: `dispatch({ type: 'ACTION_NAME', payload: {...} })`
4. Test that state updates correctly

### Adding a New Map

1. Define `GameMap` structure in `src/lib/mapData.ts` with:
   - Regions with cities (x%, y% positions)
   - Connection array for power lines
   - Cost multiplier for region
2. Add to `MAPS` export dictionary
3. Update `GameConfig` type to include new map option
4. Update game setup UI in `page.tsx`

Example map:
```ts
export const NEW_MAP: GameMap = {
  id: 'newmap',
  name: 'New Region',
  width: 800, height: 600,
  regions: [{
    id: 'region1',
    name: 'Region 1',
    costMultiplier: 1.0,
    cities: [
      { id: 'city1', name: 'City 1', x: 30, y: 40, region: 'region1' },
    ],
  }],
  connections: [{ cityA: 'city1', cityB: 'city2' }],
};
```

## File Reference

- [src/types/game.ts](src/types/game.ts) - Type definitions (DO NOT modify enums without updating logic)
- [src/lib/gameEngine.ts](src/lib/gameEngine.ts) - Game rules (unit-testable)
- [src/lib/mapData.ts](src/lib/mapData.ts) - Map definitions and cities
- [src/contexts/GameContext.tsx](src/contexts/GameContext.tsx) - State management
- [src/app/layout.tsx](src/app/layout.tsx) - Must include GameProvider wrapper
- [src/app/page.tsx](src/app/page.tsx) - Entry point, setup/game selection
- [src/components/GameBoard.tsx](src/components/GameBoard.tsx) - Main game UI container
- [src/components/GameMap.tsx](src/components/GameMap.tsx) - Interactive map component
- [src/components/Auction.tsx](src/components/Auction.tsx) - Auction interface

## Performance Considerations

- `useGame()` trigger re-renders on any state change - use React.memo() for expensive child components
- SVG map rendering is optimized for up to 20 cities; consider simplifying for larger maps
- City connection lines could use path simplification if performance degrades
- Player legend updates on every render - memoize if player count > 10

## Known Limitations & TODOs

- Single-player only (no WebSocket multiplayer yet)
- No AI opponents
- No persistence (state lost on refresh)
- Limited power plant variety (6 plants hardcoded)
- No map visualization (placeholder grid)
