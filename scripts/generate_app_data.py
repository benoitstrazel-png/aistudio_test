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
        
    # 1. Calc Stats (Base Strength from 2024-2025)
    matches_24_25 = [m for m in matches if '2024' in str(m.get('season', '')) or '2025' in str(m.get('date', ''))]
    
    # Calculate base strength from last season
    team_stats_base = {}
    for m in matches_24_25:
        h, a = m['home_team'], m['away_team']
        hg, ag = m['full_time_home_goals'], m['full_time_away_goals']
        
        if h not in team_stats_base: team_stats_base[h] = {'gf': 0, 'ga': 0, 'pl': 0}
        if a not in team_stats_base: team_stats_base[a] = {'gf': 0, 'ga': 0, 'pl': 0}
        
        team_stats_base[h]['gf'] += hg; team_stats_base[h]['ga'] += ag; team_stats_base[h]['pl'] += 1
        team_stats_base[a]['gf'] += ag; team_stats_base[a]['ga'] += hg; team_stats_base[a]['pl'] += 1
        
    final_stats = {}
    teams_list = list(team_stats_base.keys())
    if not teams_list:
        # Fallback teams if json is empty
        teams_list = ["PSG", "Marseille", "Lyon", "Monaco", "Lille", "Lens", "Rennes", "Nice", "Brest", "Reims", "Strasbourg", "Toulouse", "Montpellier", "Nantes", "Le Havre", "Auxerre", "St Etienne", "Angers"]
        
    avg_g_league = 1.35 # Approx goals per team per match
    
    for t in teams_list:
        s = team_stats_base.get(t, {'gf': 45, 'ga': 45, 'pl': 34}) # Default stats
        g_avg = s['gf'] / max(1, s['pl'])
        ga_avg = s['ga'] / max(1, s['pl'])
        final_stats[t] = {
            'att': g_avg / avg_g_league,
            'def': ga_avg / avg_g_league
        }

    # 2. MATCHES 2025-2026 (REAL)
    # Since we fetched real 25-26 data, we use it directly.
    all_season_matches = [m for m in matches if '2025-2026' in str(m.get('season','')) or ('2025' in str(m.get('date','')) and int(str(m.get('date','')).split('-')[1]) > 7) ]
    
    # STRICT FILTER: Only keep teams that played in 2025-2026
    current_season_teams = set()
    for m in all_season_matches:
        current_season_teams.add(m['home_team'])
        current_season_teams.add(m['away_team'])
        
    # Update teams_list to strict set
    if current_season_teams:
        teams_list = list(current_season_teams)
    
    # If fetch was empty (early season), barely any matches
    if not all_season_matches:
        print("No real 2025-26 matches found yet in CSV. Using dummy simulation disabled.")
        if not current_season_teams: teams_list = list(team_stats_base.keys()) # Fallback
        
    print(f"Using {len(all_season_matches)} real matches from CSV. Found {len(teams_list)} active teams.")
    
    # 3. Generate Future Matches (Next Week)
    # We predict next matches based on logic or random pairing if no schedule
    next_matches = []
    
    # Generate random next fixtures based on available teams
    teams_playing = list(teams_list)
    random.shuffle(teams_playing)
    start_next_date = (datetime.now() + timedelta(days=3)).strftime("%Y-%m-%d")
    
    while len(teams_playing) >= 2:
        h = teams_playing.pop()
        a = teams_playing.pop()
        pred = predict_one_match(h, a, final_stats)
        
        m_obj = {
            "id": random.randint(10000, 99999),
            "homeTeam": h,
            "awayTeam": a,
            "date": start_next_date,
            "odds": {
                "home": round(1/max(0.05, pred['probs']['1']) * 0.92, 2),
                "draw": round(1/max(0.05, pred['probs']['N']) * 0.92, 2),
                "away": round(1/max(0.05, pred['probs']['2']) * 0.92, 2)
            },
            "prediction": pred
        }
        next_matches.append(m_obj)
            
    # Fallback if season over or empty schedule
    if not next_matches:
        # Just generate random pair
        h, a = random.sample(teams_list, 2)
        if h == "Bye" or a == "Bye": h, a = "PSG", "Marseille"
        pred = predict_one_match(h, a, final_stats)
        next_matches.append({
            "id": 999, "homeTeam": h, "awayTeam": a, "date": "2025-12-20",
            "odds": {"home": 2.0, "draw": 3.0, "away": 4.0}, "prediction": pred
        })

    # 4. Standings Calculation (Only 2025-2026 matches)
    standings_map = {}
    for t in teams_list:
        if t != "Bye": standings_map[t] = {'pts': 0, 'p': 0, 'w': 0, 'd': 0, 'l': 0}
        
    for m in all_season_matches:
        h, a = m['home_team'], m['away_team']
        hg, ag = m['full_time_home_goals'], m['full_time_away_goals']
        
        if h not in standings_map: continue
        if a not in standings_map: continue
        
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
        proj = s['pts'] / max(1, s['p']) * 34
        standings_list.append({
            "team": t,
            "points": s['pts'],
            "played": s['p'],
            "projectedPoints": int(proj),
            "status": "live"
        })
    standings_list.sort(key=lambda x: x['points'], reverse=True)
    
    # 5. Stats Summary
    total_goals = sum(m['full_time_home_goals'] + m['full_time_away_goals'] for m in all_season_matches)
    n_games = len(all_season_matches)
    season_stats = {
        "totalGoals": total_goals,
        "goalsPerMatch": round(total_goals / max(1, n_games), 2),
        "goalsPerDay": round(total_goals / max(1, n_games / 9), 1)
    }

    # Add Matchday info roughly
    # Sort by date
    all_season_matches.sort(key=lambda x: x['date'])
    
    # Simple algorithm to assign Matchweek (J1, J2...)
    # We track how many games each team played
    team_games = {t: 0 for t in teams_list}
    export_matches = []
    
    for m in all_season_matches:
        h, a = m['home_team'], m['away_team']
        # The matchweek is roughly max(games_h, games_a) + 1
        # But for global consistency, we group by date blocks usually.
        # Let's just increment per team
        week = max(team_games.get(h,0), team_games.get(a,0)) + 1
        
        # update
        team_games[h] = team_games.get(h,0) + 1
        team_games[a] = team_games.get(a,0) + 1
        
        m_copy = m.copy()
        m_copy['week'] = week
        export_matches.append(m_copy)

    # Save Everything
    full_data = {
        "seasonStats": season_stats,
        "nextMatches": next_matches,
        "standings": standings_list,
        "teamStats": final_stats,
        "matchesPlayed": export_matches, # NEW for Time Travel
        "currentWeek": max(team_games.values()) if team_games else 1
    }
    
    with open(os.path.join(DATA_DIR, 'app_data.json'), 'w') as f:
        json.dump(full_data, f, indent=2)
        
    print(f"Generated 2025-2026 Season Data: {len(all_season_matches)} matches played, {len(next_matches)} upcoming.")


if __name__ == "__main__":
    main()
