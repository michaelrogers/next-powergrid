# Power Grid - Implementation Assumptions & Testing Guide

This document maps official Power Grid: Recharged rules to the current digital implementation, with emphasis on testability and validation criteria.

## Game Overview

**Official Rule**: Power Grid is played in rounds, with each round consisting of 5 phases: Determine Player Order, Auction Power Plants, Buy Resources, Build Cities, and Bureaucracy.

**Implementation Status**: ✅ Phases implemented as enum values  
**Testing**: Verify `GamePhase` enum includes all phases and transitions occur in correct sequence

---

## Phase 1: Determine Player Order

### Rule: Turn Order Based on Network Size
**Official**: Players are ordered by (1) most cities, (2) highest power plant number as tiebreaker. Last-place player goes first in auction.

**Implementation Status**: ❌ Not implemented - turn order is static  
**Gap**: Current implementation uses fixed player order from initialization  
**Testing Needed**:
- [ ] Implement `calculatePlayerOrder()` function sorting by cities (desc), then highest plant number (desc)
- [ ] Verify turn order reverses for auction (lowest → highest)
- [ ] Test tiebreaker scenarios

---

## Phase 2: Auction Power Plants

### Rule 2.1: Auction Market Structure
**Official**: 8 power plants visible - 4 in "actual market" (ascending order), 4 in "futures market". During Step 3, only actual market is used.

**Implementation Status**: ✅ Complete - market split with proper sorting and deck management  
**Current**: 
- `actualMarket` array (4 plants) - top row, biddable
- `futuresMarket` array (4 plants) - bottom row, preview only
- `powerPlantDeck` array - remaining plants
- Plants sorted by number (ascending)
- Market refreshes after each purchase: draw from deck, re-sort, split
**Testing**:
- [x] Verify actual market shows 4 plants in ascending order
- [x] Verify futures market shows next 4 plants
- [x] Test market refresh: buy plant → draw from deck → re-sort
- [ ] Test Step 3 behavior (actual market only)

### Rule 2.2: Minimum Bid
**Official**: First bid must be at least equal to power plant number. Subsequent bids must exceed current bid by at least 1 Elektro.

**Implementation Status**: ✅ Implemented in `PowerGridEngine.getMinimumBid()`  
**Testing**:
```typescript
// Test cases in src/lib/__tests__/gameEngine.test.ts
- Plant #15, no bids → minimum = 15
- Plant #15, current bid 20 → minimum = 21
- Verify placeBid() rejects bids below minimum
```

### Rule 2.3: Auction Participation
**Official**: Each player must either start an auction OR pass on their turn. Once passed, cannot re-enter auction round. Player who starts auction MUST win a plant or buy nothing.

**Implementation Status**: ✅ Auction participants tracked in Set  
**Current**: `auction.participants` removed on pass, checked before bidding  
**Testing**:
- [ ] Verify passed players cannot bid: `!auction.participants.has(playerId)`
- [ ] Test auction starter must win or get nothing
- [ ] Verify all-pass scenario discards plant correctly

### Rule 2.4: Auction Flow
**Official**: Clockwise bidding until all pass except one. Winner pays bid, removes old plant if >3 owned.

**Implementation Status**: ✅ Complete - turn advancement, 3-plant limit enforced  
**Current**: 
- Turn advancement via PLACE_BID/PASS_AUCTION
- PlantDiscardModal triggers when player has 3 plants
- Robots auto-discard lowest-numbered plant
**Testing**:
- [x] Verify PLACE_BID advances to next participant
- [x] Verify PASS_AUCTION removes participant from Set
- [x] Test 3-plant limit: buying 4th plant triggers discard modal
- [x] Test robot auto-discard chooses lowest plant number
- [ ] Test human discard selection UI

---

## Phase 3: Buy Resources

### Rule 3.1: Resource Market
**Official**: Market has 24 coal, 24 oil, 24 garbage, 12 uranium spaces. Prices increase as supply decreases (steps of 8/4/3/3/1/1/1 with escalating prices).

**Implementation Status**: ⚠️ Partial - market structure exists, pricing may differ  
**Current**: `fuelMarket: Record<FuelType, FuelMarketEntry[]>` with price/quantity  
**Testing**:
- [ ] Verify market initialization: 24 coal/oil/garbage slots, 12 nuclear
- [ ] Test price steps match official: $1→$2→$3→$4→$5→$6→$7→$8 for coal (8-8-8-4-3-3-1-1 distribution)
- [ ] Verify uranium prices: $1→$14 (steps: 1-1-1-1-2-2-2-2-3-3-4-5)

### Rule 3.2: Purchase Limits
**Official**: Players can buy resources up to 2x storage capacity (sum of all plant fuel capacities).

**Implementation Status**: ✅ Implemented - 2x rule applied  
**Current**: `fuelCapacity * 2` calculation in FuelMarket and PlayerPanel  
**Testing**:
```typescript
// Test storage capacity
const plant1 = { fuelCapacity: 2 }; // 2 coal
const plant2 = { fuelCapacity: 3 }; // 3 oil
// Total storage = (2 + 3) * 2 = 10 resources max
- [ ] Verify purchase blocked when at capacity
- [ ] Test mixed fuel types within single capacity
```

### Rule 3.3: Resource Refill
**Official**: After all players buy, market refills: 3 coal/oil/garbage per player (Step 1), 4/player (Step 2), 3/player (Step 3). Uranium: 1/player (all steps).

**Implementation Status**: ❌ Not implemented  
**Testing Needed**:
- [ ] Implement `refillFuelMarket(playerCount, step)` function
- [ ] Test Step 1: 3 coal/oil/garbage per player, 1 uranium per player
- [ ] Verify lowest-price slots fill first

---

## Phase 4: Build Cities

### Rule 4.1: Connection Costs
**Official**: Cities have base connection cost (10-20 Elektro). Distance between cities adds 0/5/10/15/20 Elektro for 0-4 connections. Total cost = city base + distance cost.

**Implementation Status**: ❌ Distance-based costing not implemented  
**Current**: Fixed cost per city in BUILD_CITY action  
**Testing Needed**:
- [ ] Add `connections: number` field to cities in map data
- [ ] Implement `calculateBuildCost(fromCity, toCity, playerCities)` function
- [ ] Test cost calculation: City A (cost 10) + 2 connections (10 Elektro) = 20 total
- [ ] Verify first city has 0 distance cost

### Rule 4.2: Building Restrictions
**Official**: Step 1 - only 1 player per city. Step 2 - up to 2 players per city. Step 3 - up to 3 players per city.

**Implementation Status**: ❌ Step-based restrictions not implemented  
**Testing Needed**:
- [ ] Add `step` field to GameState (1, 2, or 3)
- [ ] Implement city occupation check: `getCityOccupants(cityId).length < step`
- [ ] Test blocking builds when city full

### Rule 4.3: Network Connectivity
**Official**: New cities must connect to existing network (except first city).

**Implementation Status**: ❌ Not validated  
**Testing Needed**:
- [ ] Implement graph traversal: `isConnectedToNetwork(cityId, playerCities, gameMap)`
- [ ] Test first city always allowed
- [ ] Test subsequent cities must be adjacent to owned city

---

## Phase 5: Bureaucracy

### Rule 5.1: Power Delivery
**Official**: Players earn money based on cities powered. Must have sufficient fuel to power each plant (cannot partial-power). Payment table based on player count.

**Implementation Status**: ✅ Implemented in BureaucracyPhase  
**Testing**:
```typescript
// Verify fuel consumption logic:
- Plant with fuelCapacity=2, fuelType=[coal] requires exactly 2 coal
- Plant with fuelCapacity=2, fuelType=[coal,oil] can use 2 coal OR 2 oil OR 1+1
- Renewable plants (fuelCapacity=0) always power cities
- [ ] Test payment table matches official rules (1-5 player variants)
```

### Rule 5.2: Payment Table (6-player variant)
**Official**:
- 0 cities: $10
- 1 city: $10
- 2 cities: $22
- 3 cities: $33
- 4 cities: $44
- 5 cities: $54
- 6 cities: $64
- ... (continues up to 20 cities)

**Implementation Status**: ⚠️ Uses simplified calculation  
**Current**: `PowerGridEngine.calculatePayment()` may not match official table  
**Testing**:
- [ ] Compare output of calculatePayment(cities, 6) against official table
- [ ] Test all player counts (2-6 players have different tables)
- [ ] Verify progressive non-linear scaling

---

## Game Progression & Steps

### Rule 6.1: Step Advancement
**Official**: 
- Step 1 → Step 2: When any player builds their Nth city (N = player count)
- Step 2 → Step 3: When any player builds their 2N city
- Step 3 removes lowest plant from market each round

**Implementation Status**: ❌ Not implemented  
**Testing Needed**:
- [ ] Add step advancement triggers in BUILD_CITY action
- [ ] Test 4-player game: Step 2 at 4 cities, Step 3 at 8 cities
- [ ] Implement lowest plant discard in Step 3

### Rule 6.2: Game End Condition
**Official**: Game ends immediately when any player connects their Nth city (N = 21 for 2-player, 17 for 3-player, 15 for 4-player, etc.)

**Implementation Status**: ❌ Not implemented  
**Testing Needed**:
- [ ] Add victory condition check after BUILD_CITY
- [ ] Calculate winner: Most cities powered (not owned)
- [ ] Test tiebreaker: money remaining

---

## Power Plants

### Rule 7.1: Plant Storage & Fuel
**Official**: Each plant stores up to 2x its fuel consumption. E.g., plant using 2 coal can store up to 4 coal.

**Implementation Status**: ✅ Implemented  
**Testing**: Already validated - 2x multiplier in UI and storage checks

### Rule 7.2: Hybrid Plants
**Official**: Hybrid plants (coal/oil symbol) can burn EITHER fuel type, not both mixed.

**Implementation Status**: ⚠️ Partial - implementation allows mixing  
**Current**: BureaucracyPhase consumes from multiple fuel types in `fuelType[]`  
**Gap**: Should consume from ONE type only per burn cycle  
**Testing**:
- [ ] Modify fuel consumption to select single fuel type (highest available)
- [ ] Test hybrid plant with 3 coal, 1 oil, capacity 2 → consumes 2 coal (not 1+1)

### Rule 7.3: Ecological Plants
**Official**: Renewable plants (wind/solar) have no fuel cost, always available.

**Implementation Status**: ✅ Implemented  
**Testing**: Verified in BureaucracyPhase - `fuelType.length === 0` bypass fuel checks

---

## Robot AI

### Rule 8.1: AI Difficulty Levels
**Implementation-Specific**: Three difficulty levels with aggressiveness factor.

**Implementation Status**: ✅ Implemented in RobotAI  
**Testing**:
- [ ] EASY bots should bid conservatively (aggressiveness 0.3)
- [ ] HARD bots should overbid frequently (aggressiveness 0.9)
- [ ] Test 100 auctions per difficulty, measure win rates

### Rule 8.2: AI Fuel Strategy
**Implementation Status**: ⚠️ Exists but needs validation  
**Testing**:
- [ ] Verify robots buy fuel proportional to plant needs
- [ ] Test robots prioritize cheapest available fuel
- [ ] Ensure robots don't exceed storage capacity

---

## Known Gaps & Priorities

### High Priority (Core Rules)
1. ✅ **3-plant limit enforcement** - COMPLETED: PlantDiscardModal with robot auto-discard
2. ✅ **Market split** (actual/futures) - COMPLETED: Two-row display with deck management
3. ❌ **Step progression** - Game never advances to Step 2/3
4. ❌ **Turn order recalculation** - Static order breaks balance
5. ❌ **End game condition** - Games never terminate

### Medium Priority (Gameplay Balance)
6. ❌ **Distance-based building costs** - Makes cities too cheap
7. ❌ **Network connectivity validation** - Allows impossible builds
8. ❌ **Fuel market refill** - Resources deplete permanently
9. ⚠️ **Payment table accuracy** - May pay incorrect amounts
10. ⚠️ **Hybrid fuel consumption** - Allows invalid fuel mixing

### Low Priority (Polish)
11. ❌ **City occupation limits** (Step-based) - Only matters multiplayer
12. ⚠️ **Resource market pricing** - Minor balance impact

---

## Test Plan Summary

### Unit Tests Needed
```typescript
// src/lib/__tests__/gameEngine.test.ts
describe('PowerGridEngine', () => {
  test('calculatePlayerOrder - sorts by cities then plant number');
  test('getMinimumBid - enforces plant number floor');
  test('calculatePayment - matches official table for all player counts');
  test('refillFuelMarket - correct quantities per step');
  test('calculateBuildCost - distance + base cost');
  test('isNetworkConnected - validates city adjacency');
  test('checkVictoryCondition - correct city threshold per player count');
});

// src/lib/__tests__/robotAI.test.ts
describe('RobotAI', () => {
  test('decideBid - respects difficulty aggressiveness');
  test('decideFuelPurchase - stays within storage capacity');
  test('decideCityBuilding - prefers cheaper connections');
});
```

### Integration Tests
```typescript
// Auction flow test
test('Full auction cycle - 4 players bid, highest wins, money deducted');

// Phase transition test
test('Round progression - AUCTION → FUEL → BUILD → BUREAUCRACY → AUCTION');

// Step advancement test
test('4-player game - Step 2 trigger at 4 cities, Step 3 at 8 cities');

// End game test
test('Game ends when player reaches 15 cities (4-player), winner determined by cities powered');
```

### Manual Test Scenarios
1. **3-Plant Limit**: Buy 3 plants, verify 4th forces discard UI
2. **Turn Order**: Build cities, verify order reverses based on network size
3. **Fuel Market**: Deplete coal to $8, verify price progression
4. **Hybrid Plants**: Buy hybrid plant, verify burns only one fuel type
5. **Victory Condition**: Reach 15 cities in 4-player game, verify game ends and winner declared

---

## Implementation Roadmap

### Phase 1: Core Rules (Week 1)
- [ ] Implement step progression (Step 1 → 2 → 3)
- [ ] Add 3-plant limit enforcement
- [ ] Fix turn order recalculation
- [ ] Implement victory condition

### Phase 2: Market Mechanics (Week 2)
- [ ] Split actual/futures market
- [ ] Implement fuel market refill
- [ ] Fix payment table accuracy
- [ ] Add distance-based building costs

### Phase 3: Validation & Polish (Week 3)
- [ ] Network connectivity validation
- [ ] City occupation limits
- [ ] Hybrid fuel consumption fix
- [ ] Comprehensive test suite

---

## Testing Command Reference

```bash
# Run unit tests
npm test src/lib/__tests__/gameEngine.test.ts

# Run integration tests
npm test src/components/__tests__/

# Test specific rule
npm test -- --testNamePattern="step advancement"

# Watch mode for TDD
npm test -- --watch
```

---

*Document Version: 1.0*  
*Last Updated: January 31, 2026*  
*Based on: Power Grid Recharged Rulebook (Rio Grande Games)*
