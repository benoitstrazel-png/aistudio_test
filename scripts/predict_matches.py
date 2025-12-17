import json
import os
import math
from datetime import datetime

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'src', 'data')

def poisson_probability(actual, mean):
    p = math.exp(-mean)
    for i in range(actual):
        p *= mean
        p /= (i + 1)
    return p

def predict_match(home_team, away_team, stats):
    """
    Simple Poisson Prediction Model
    """
    home_attack = stats.get(home_team, {}).get('attack_strength', 1.0)
    home_defense = stats.get(home_team, {}).get('defense_strength', 1.0)
    away_attack = stats.get(away_team, {}).get('attack_strength', 1.0)
    away_defense = stats.get(away_team, {}).get('defense_strength', 1.0)
    
    league_avg_home_goals = 1.5 # Approximate
    league_avg_away_goals = 1.15
    
    # Expected Goals
    home_xg = home_attack * away_defense * league_avg_home_goals
    away_xg = away_attack * home_defense * league_avg_away_goals
    
    # Calculate Probabilities for exact scores (0-0 to 5-5)
    probs = {}
    winner_prob = {'home': 0, 'draw': 0, 'away': 0}
    
    max_prob = 0
    likely_score = "0-0"
    
    for h in range(6):
        for a in range(6):
            p = poisson_probability(h, home_xg) * poisson_probability(a, away_xg)
            if p > max_prob:
                max_prob = p
                likely_score = f"{h}-{a}"
            
            if h > a: winner_prob['home'] += p
            elif h == a: winner_prob['draw'] += p
            else: winner_prob['away'] += p
            
    # Normalize winner probs (they might sum to ~0.99)
    total_p = sum(winner_prob.values())
    confidence = 0
    winner = "Draw"
    
    if winner_prob['home'] > winner_prob['away'] and winner_prob['home'] > winner_prob['draw']:
        winner = home_team
        confidence = winner_prob['home']
    elif winner_prob['away'] > winner_prob['home'] and winner_prob['away'] > winner_prob['draw']:
        winner = away_team
        confidence = winner_prob['away']
    else:
        winner = "Match Nul"
        confidence = winner_prob['draw']
        
    return {
        "winner": winner,
        "score": likely_score,
        "confidence": int(confidence * 100),
        "home_win_prob": int(winner_prob['home'] * 100),
        "draw_prob": int(winner_prob['draw'] * 100),
        "away_win_prob": int(winner_prob['away'] * 100),
        "advice": "Victoire " + winner if confidence > 0.50 else "Coup risqué"
    }

def calculate_team_stats(fixtures):
    """
    Calculate Attack/Defense strengths based on played matches
    """
    finished = [f for f in fixtures if f['status'] == 'FINISHED' and f['home_goals'] is not None]
    
    if not finished:
        print("No matches played yet. Using default stats.")
        return {}

    stats = {}
    teams = set([f['home_team'] for f in finished] + [f['away_team'] for f in finished])
    
    # Init
    for t in teams:
        stats[t] = {'played': 0, 'gf': 0, 'ga': 0}
        
    avg_home_goals = 0
    avg_away_goals = 0
    
    for m in finished:
        h, a = m['home_team'], m['away_team']
        hg, ag = m['home_goals'], m['away_goals']
        
        stats[h]['played'] += 1; stats[h]['gf'] += hg; stats[h]['ga'] += ag
        stats[a]['played'] += 1; stats[a]['gf'] += ag; stats[a]['ga'] += hg
        
        avg_home_goals += hg
        avg_away_goals += ag
        
    games = len(finished)
    avg_home_goals /= games
    avg_away_goals /= games
    
    # Create Strengths
    final_stats = {}
    for t, s in stats.items():
        if s['played'] < 1: continue
        # Attack = (Goals Scored / Games) / League Avg
        # Defense = (Goals Conceded / Games) / League Avg
        # Note: We simplify heavily here.
        att = (s['gf'] / s['played']) / ((avg_home_goals + avg_away_goals) / 2)
        defe = (s['ga'] / s['played']) / ((avg_home_goals + avg_away_goals) / 2)
        final_stats[t] = {'attack_strength': att, 'defense_strength': defe}
        
    return final_stats

def main():
    fixtures_path = os.path.join(DATA_DIR, 'fixtures.json')
    if not os.path.exists(fixtures_path):
        print("Fixtures not found. Run scraper first.")
        return

    with open(fixtures_path, 'r') as f:
        fixtures = json.load(f)
        
    stats = calculate_team_stats(fixtures)
    
    # Filter upcoming matches (next 10)
    upcoming = [f for f in fixtures if f['status'] == 'SCHEDULED']
    # Sort by date
    upcoming.sort(key=lambda x: x['date'] if x['date'] else "9999-99-99")
    upcoming = upcoming[:10]
    
    predictions = []
    
    for match in upcoming:
        pred = predict_match(match['home_team'], match['away_team'], stats)
        # Merge info
        full_match = {**match, "prediction": pred}
        predictions.append(full_match)
        
    # Add dummy odds if missing (since scraper doesn't get odds yet)
    for p in predictions:
        p['odds'] = {'home': 1.0, 'draw': 1.0, 'away': 1.0} # Placeholder
        
    output_path = os.path.join(DATA_DIR, 'predictions.json')
    with open(output_path, 'w') as f:
        json.dump(predictions, f, indent=2)
        
    print(f"Generated predictions for {len(predictions)} matches.")

if __name__ == "__main__":
    main()
