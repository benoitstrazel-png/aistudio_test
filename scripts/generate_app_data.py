import json
import os
import math
import random
from datetime import datetime, timedelta

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'src', 'data')
LEGACY_PATH = os.path.join(DATA_DIR, 'matches_legacy.json')

def poisson_probability(actual, mean):
    p = math.exp(-mean)
    for i in range(actual):
        p *= mean
        p /= (i + 1)
    return p

def predict_one_match(home, away, stats):
    h_att = stats.get(home, {}).get('att', 1.0)
    h_def = stats.get(home, {}).get('def', 1.0)
    a_att = stats.get(away, {}).get('att', 1.0)
    a_def = stats.get(away, {}).get('def', 1.0)
    
    # Base goals
    avg_h = 1.5
    avg_a = 1.2
    
    exp_h = h_att * a_def * avg_h
    exp_a = a_att * h_def * avg_a
    
    # Monte Carlo or Max Prob
    max_p = 0
    score = "0-0"
    w_probs = {'1': 0, 'N': 0, '2': 0}
    
    for h in range(6):
        for a in range(6):
            prob = poisson_probability(h, exp_h) * poisson_probability(a, exp_a)
            if prob > max_p:
                max_p = prob
                score = f"{h}-{a}"
                
            if h > a: w_probs['1'] += prob
            elif h == a: w_probs['N'] += prob
            else: w_probs['2'] += prob
            
    conf = max(w_probs.values())
    w_label = home if w_probs['1'] == conf else away if w_probs['2'] == conf else "Nul"
    
    advice = "Aucun"
    if w_probs['1'] > 0.6: advice = f"Victoire {home}"
    elif w_probs['2'] > 0.6: advice = f"Victoire {away}"
    elif exp_h + exp_a > 2.8: advice = "+2.5 Buts"
    elif w_probs['N'] > 0.30: advice = "Match Nul Risqué"
    else: advice = "Les deux marquent (BTTS)"
    
    return {
        "score": score,
        "winner": w_label,
        "confidence": int(conf * 100),
        "advice": advice,
        "probs": w_probs
    }

def main():
    if not os.path.exists(LEGACY_PATH):
        print("No legacy data.")
        return
        
    with open(LEGACY_PATH, 'r') as f:
        matches = json.load(f)
        
    # 1. Calc Stats
    team_stats = {}
    total_goals = 0
    total_games = 0
    
    # Filter only recent season
    matches = [m for m in matches if '2025' in str(m.get('season', '')) or '2024' in str(m.get('season', ''))]
    
    for m in matches:
        h, a = m['home_team'], m['away_team']
        hg = m['full_time_home_goals']
        ag = m['full_time_away_goals']
        
        if h not in team_stats: team_stats[h] = {'gf': 0, 'ga': 0, 'pl': 0}
        if a not in team_stats: team_stats[a] = {'gf': 0, 'ga': 0, 'pl': 0}
        
        team_stats[h]['gf'] += hg; team_stats[h]['ga'] += ag; team_stats[h]['pl'] += 1
        team_stats[a]['gf'] += ag; team_stats[a]['ga'] += hg; team_stats[a]['pl'] += 1
        
        total_goals += (hg + ag)
        total_games += 1
        
    avg_g_game = total_goals / total_games if total_games else 2.5
    
    final_stats = {}
    for t, s in team_stats.items():
        if s['pl'] == 0: continue
        g_avg = s['gf'] / s['pl']
        ga_avg = s['ga'] / s['pl']
        # Strength relative to league avg/2 (approx 1.25 goals per team)
        final_stats[t] = {
            'att': g_avg / 1.25,
            'def': ga_avg / 1.25
        }
    
    # 2. Generate Future Fixtures (Next Matchday simulation)
    # We pair teams that haven't played recently or random for demo
    teams = list(final_stats.keys())
    random.shuffle(teams)
    
    future_matches = []
    while len(teams) >= 2:
        h = teams.pop()
        a = teams.pop()
        
        pred = predict_one_match(h, a, final_stats)
        
        match = {
            "id": random.randint(1000, 9999),
            "homeTeam": h,
            "awayTeam": a,
            "date": (datetime.now() + timedelta(days=random.randint(1, 7))).strftime("%Y-%m-%d"),
            "odds": {
                "home": round(1/max(0.01, pred['probs']['1']) * 0.9, 2),
                "draw": round(1/max(0.01, pred['probs']['N']) * 0.9, 2),
                "away": round(1/max(0.01, pred['probs']['2']) * 0.9, 2)
            },
            "prediction": pred
        }
        future_matches.append(match)
        
    # 3. Stats Summary
    season_stats = {
        "totalGoals": int(total_goals),
        "goalsPerMatch": round(avg_g_game, 2),
        "goalsPerDay": round(avg_g_game * 9, 2) # approx 9 games/day
    }
    
    # 4. Standings
    # Re-calculate standings from legacy matches
    standings_map = {}
    for m in matches:
        h, a = m['home_team'], m['away_team']
        hg, ag = m['full_time_home_goals'], m['full_time_away_goals']
        
        if h not in standings_map: standings_map[h] = {'pts': 0, 'p': 0, 'w': 0, 'd': 0, 'l': 0}
        if a not in standings_map: standings_map[a] = {'pts': 0, 'p': 0, 'w': 0, 'd': 0, 'l': 0}
        
        standings_map[h]['p'] += 1; standings_map[a]['p'] += 1
        
        if hg > ag:
            standings_map[h]['pts'] += 3; standings_map[h]['w'] += 1; standings_map[a]['l'] += 1
        elif ag > hg:
            standings_map[a]['pts'] += 3; standings_map[a]['w'] += 1; standings_map[h]['l'] += 1
        else:
            standings_map[h]['pts'] += 1; standings_map[a]['pts'] += 1
            standings_map[h]['d'] += 1; standings_map[a]['d'] += 1
            
    standings_list = []
    for t, s in standings_map.items():
        proj = s['pts'] / s['p'] * 34 if s['p'] > 0 else 0
        standings_list.append({
            "team": t,
            "points": s['pts'],
            "played": s['p'],
            "projectedPoints": int(proj),
            "status": "live"
        })
    standings_list.sort(key=lambda x: x['points'], reverse=True)
    
    # Save Everything
    full_data = {
        "seasonStats": season_stats,
        "nextMatches": future_matches,
        "standings": standings_list,
        "teamStats": final_stats # Needed for Radar
    }
    
    with open(os.path.join(DATA_DIR, 'app_data.json'), 'w') as f:
        json.dump(full_data, f, indent=2)
        
    print("App Data Generated successfully.")

if __name__ == "__main__":
    main()
