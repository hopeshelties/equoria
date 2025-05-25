# Trait Discovery System Documentation

## Overview

The Trait Discovery System is a sophisticated feature that reveals hidden traits in foals when specific conditions are met. This system adds depth to the gameplay by rewarding players for proper care, enrichment activities, and achieving specific milestones during foal development.

## System Architecture

### Core Components

1. **Trait Discovery Engine** (`backend/utils/traitDiscovery.js`)
   - Main logic for evaluating discovery conditions
   - Trait revelation and database updates
   - Progress tracking and condition evaluation

2. **REST API** (`backend/routes/traitDiscoveryRoutes.js`)
   - RESTful endpoints for trait discovery operations
   - Real-time discovery triggers and progress monitoring

3. **Cron Integration** (`backend/services/cronJobs.js`)
   - Automatic trait discovery during daily trait evaluation
   - Seamless integration with existing trait evaluation system

## Discovery Conditions

### Bonding-Based Conditions

#### High Bonding Achievement
- **Trigger:** Bonding score ≥ 80
- **Reveals:** intelligent, calm, trainability_boost, legendary_bloodline
- **Description:** Rewards strong emotional bonds between foal and caretaker

#### Perfect Care Achievement
- **Trigger:** Bonding score ≥ 90 AND stress level ≤ 15
- **Reveals:** legendary_bloodline, weather_immunity, night_vision
- **Description:** Rewards exceptional care with rare trait revelations

### Stress-Based Conditions

#### Low Stress Achievement
- **Trigger:** Stress level ≤ 20
- **Reveals:** resilient, athletic, bold, weather_immunity
- **Description:** Rewards maintaining low stress levels through proper care

### Activity-Based Conditions

#### Social Development
- **Trigger:** Complete 3+ social enrichment activities
- **Activities:** gentle_handling, human_interaction, social_play
- **Reveals:** calm, intelligent, trainability_boost
- **Description:** Rewards social interaction and bonding activities

#### Physical Development
- **Trigger:** Complete 3+ physical enrichment activities
- **Activities:** exercise, obstacle_course, free_play
- **Reveals:** athletic, bold, resilient
- **Description:** Rewards physical exercise and movement activities

#### Mental Development
- **Trigger:** Complete 3+ mental enrichment activities
- **Activities:** puzzle_feeding, sensory_exposure, learning_games
- **Reveals:** intelligent, trainability_boost, night_vision
- **Description:** Rewards cognitive stimulation and learning activities

### Milestone Conditions

#### Development Completion
- **Trigger:** Development day ≥ 6 (end of foal development period)
- **Reveals:** All remaining hidden traits
- **Description:** Ensures all traits are revealed by the end of development

## API Endpoints

### POST /api/traits/discover/:foalId
Manually trigger trait discovery for a specific foal.

**Parameters:**
- `foalId` (path): Integer ID of the foal

**Response:**
```json
{
  "success": true,
  "message": "Discovered 2 new traits!",
  "data": {
    "foalId": 1,
    "foalName": "Starlight",
    "conditionsMet": [
      {
        "key": "high_bonding",
        "name": "High Bonding Achievement",
        "description": "Reveals traits when bonding score exceeds 80"
      }
    ],
    "traitsRevealed": [
      {
        "traitKey": "intelligent",
        "traitName": "Intelligent",
        "category": "positive",
        "revealedBy": "high_bonding",
        "description": "Shows exceptional learning ability"
      }
    ],
    "hiddenTraitsRemaining": 1,
    "summary": {
      "totalConditionsMet": 1,
      "totalTraitsRevealed": 1,
      "hiddenBefore": 2,
      "hiddenAfter": 1
    }
  }
}
```

### GET /api/traits/progress/:foalId
Get trait discovery progress for a foal.

**Parameters:**
- `foalId` (path): Integer ID of the foal

**Response:**
```json
{
  "success": true,
  "data": {
    "foalId": 1,
    "foalName": "Starlight",
    "currentStats": {
      "bondScore": 85,
      "stressLevel": 15,
      "developmentDay": 3
    },
    "conditions": {
      "high_bonding": {
        "name": "High Bonding Achievement",
        "description": "Reveals traits when bonding score exceeds 80",
        "met": true,
        "revealableTraits": ["intelligent", "calm"],
        "progress": 100
      }
    },
    "hiddenTraitsCount": 2
  }
}
```

### POST /api/traits/discover/batch
Trigger trait discovery for multiple foals.

**Request Body:**
```json
{
  "foalIds": [1, 2, 3]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Batch discovery completed for 3 foals",
  "data": {
    "results": [
      {
        "foalId": 1,
        "traitsRevealed": [...]
      }
    ],
    "summary": {
      "totalFoals": 3,
      "successfulDiscoveries": 2,
      "failedDiscoveries": 1,
      "totalTraitsRevealed": 4
    }
  }
}
```

### GET /api/traits/conditions
Get all available discovery conditions.

**Response:**
```json
{
  "success": true,
  "data": {
    "conditions": [
      {
        "key": "high_bonding",
        "name": "High Bonding Achievement",
        "description": "Reveals traits when bonding score exceeds 80",
        "revealableTraits": ["intelligent", "calm"],
        "category": "bonding"
      }
    ],
    "totalConditions": 7,
    "categories": {
      "bonding": 2,
      "stress": 1,
      "activities": 3,
      "milestones": 1
    }
  }
}
```

### POST /api/traits/check-conditions/:foalId
Check which conditions a foal meets without triggering discovery.

**Parameters:**
- `foalId` (path): Integer ID of the foal

**Response:**
```json
{
  "success": true,
  "data": {
    "foalId": 1,
    "foalName": "Starlight",
    "currentStats": {
      "bondScore": 85,
      "stressLevel": 15,
      "developmentDay": 3
    },
    "conditions": [
      {
        "key": "high_bonding",
        "name": "High Bonding Achievement",
        "met": true,
        "progress": 100,
        "revealableTraits": ["intelligent", "calm"]
      }
    ],
    "summary": {
      "totalConditions": 7,
      "conditionsMet": 3,
      "averageProgress": 75,
      "hiddenTraitsRemaining": 2
    }
  }
}
```

## Integration with Existing Systems

### Daily Trait Evaluation Cron Job
The trait discovery system is automatically integrated with the existing daily trait evaluation cron job:

1. **Trait Evaluation:** Daily cron job evaluates and reveals new traits
2. **Discovery Check:** After trait evaluation, system checks for discovery conditions
3. **Automatic Revelation:** Hidden traits are revealed if conditions are met
4. **Audit Logging:** All discoveries are logged for tracking and debugging

### Foal Enrichment Activities
Discovery conditions are tied to the foal enrichment activity system:

- **Activity Tracking:** System monitors completed enrichment activities
- **Category Counting:** Activities are categorized (social, physical, mental)
- **Condition Evaluation:** Discovery conditions check activity completion
- **Real-time Updates:** Discoveries can happen immediately after activities

## Database Schema

### Trait Storage
Traits are stored in the `epigenetic_modifiers` JSONB field:

```json
{
  "positive": ["calm", "intelligent"],
  "negative": ["nervous"],
  "hidden": ["athletic", "legendary_bloodline"]
}
```

### Discovery Logging
Discovery events are logged in the `foal_training_history` table:

```sql
INSERT INTO foal_training_history (
  horse_id,
  activity_type,
  activity_name,
  bonding_change,
  stress_change,
  notes
) VALUES (
  1,
  'trait_discovery',
  'Trait Discovery Event',
  0,
  0,
  '{"event": "trait_discovery", "traitsRevealed": [...], "conditionsMet": [...]}'
);
```

## Game Design Considerations

### Player Engagement
- **Progressive Revelation:** Traits are revealed gradually, maintaining player interest
- **Achievement System:** Discovery conditions act as achievements to pursue
- **Strategic Depth:** Players must balance different care aspects for optimal results

### Balance Mechanisms
- **Multiple Paths:** Various conditions ensure different playstyles are rewarded
- **Guaranteed Completion:** Development completion ensures all traits are eventually revealed
- **Realistic Timing:** Conditions align with natural foal development progression

### User Experience
- **Clear Feedback:** API provides detailed information about progress and achievements
- **Real-time Updates:** Discoveries happen immediately when conditions are met
- **Comprehensive Tracking:** Players can monitor progress toward discovery goals

## Performance Considerations

### Efficient Queries
- **Indexed Fields:** Bond score and stress level fields are indexed for fast queries
- **Batch Processing:** Batch discovery endpoint handles multiple foals efficiently
- **Minimal Database Calls:** Discovery logic minimizes database round trips

### Scalability
- **Stateless Design:** Discovery functions are stateless and horizontally scalable
- **Async Processing:** Cron job integration allows for background processing
- **Error Isolation:** Individual foal failures don't affect batch operations

## Error Handling

### Validation
- **Input Validation:** All endpoints validate foal IDs and request parameters
- **Age Verification:** System ensures only foals (age ≤ 1) can have discoveries
- **Existence Checks:** Database queries verify foal existence before processing

### Graceful Degradation
- **Individual Failures:** Batch operations continue despite individual failures
- **Logging:** All errors are logged with detailed context for debugging
- **User Feedback:** API provides clear error messages for client handling

## Testing

### Unit Tests
- **Condition Logic:** All discovery conditions are thoroughly tested
- **Edge Cases:** Tests cover boundary conditions and error scenarios
- **Mock Integration:** Database operations are mocked for isolated testing

### Integration Tests
- **End-to-End Workflows:** Complete discovery workflows are tested
- **API Endpoints:** All REST endpoints are tested with real data
- **Database Integration:** Tests verify proper database updates and queries

## Monitoring and Debugging

### Logging
- **Structured Logging:** All discovery events use structured JSON logging
- **Performance Metrics:** Discovery timing and success rates are logged
- **Error Tracking:** Failed discoveries are logged with full context

### Audit Trail
- **Discovery History:** All trait discoveries are permanently logged
- **Condition Tracking:** System tracks which conditions triggered discoveries
- **Timeline Reconstruction:** Complete discovery timeline can be reconstructed

## Future Enhancements

### Potential Additions
- **Custom Conditions:** Allow configuration of custom discovery conditions
- **Trait Dependencies:** Implement trait prerequisites and dependencies
- **Discovery Notifications:** Real-time notifications for trait discoveries
- **Analytics Dashboard:** Admin interface for discovery statistics and trends

### Scalability Improvements
- **Caching Layer:** Cache discovery conditions and trait definitions
- **Event Streaming:** Use event streams for real-time discovery notifications
- **Microservice Architecture:** Split discovery system into dedicated microservice

## Conclusion

The Trait Discovery System provides a sophisticated and engaging mechanism for revealing hidden traits in foals. By tying discoveries to meaningful gameplay actions and milestones, the system enhances player engagement while maintaining realistic foal development progression. The comprehensive API and integration with existing systems ensure seamless operation and excellent user experience. 