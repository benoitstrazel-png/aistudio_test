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

def get_poisson_random(lam):
    # Knuth's algorithm for Poisson generation
    L = math.exp(-lam)
    k = 0
    p = 1.0
    while p > L:
        k += 1
        p *= random.random()
    return k - 1

def predict_one_match(home, away, stats):
    h_att = stats.get(home, {}).get('att', 1.0)
    h_def = stats.get(home, {}).get('def', 1.0)
    a_att = stats.get(away, {}).get('att', 1.0)
    a_def = stats.get(away, {}).get('def', 1.0)
    
    # Base goals (L1 average ~2.7 total)
    avg_h = 1.45
    avg_a = 1.25
    
    # Expected Goals (Lambda)
    exp_h = h_att * a_def * avg_h
    exp_a = a_att * h_def * avg_a
    
    # MONTE CARLO SIMULATION (500 runs)
    ITERATIONS = 500
    
    score_counts = {}
    winner_counts = {'1': 0, 'N': 0, '2': 0}
    over_2_5_count = 0
    
    for _ in range(ITERATIONS):
        # Simulate Score
        s_h = get_poisson_random(exp_h)
        s_a = get_poisson_random(exp_a)
        
        score_key = f"{s_h}-{s_a}"
        score_counts[score_key] = score_counts.get(score_key, 0) + 1
        
        # Track Winner
        if s_h > s_a: winner_counts['1'] += 1
        elif s_a > s_h: winner_counts['2'] += 1
        else: winner_counts['N'] += 1
        
        # Track Goals
        if (s_h + s_a) > 2.5:
            over_2_5_count += 1
            
    # Find Mode (Most frequent result) using the simulation data
    best_score = max(score_counts, key=score_counts.get)
    best_winner_key = max(winner_counts, key=winner_counts.get)
    
    winner_label = "Nul"
    if best_winner_key == '1': winner_label = home
    elif best_winner_key == '2': winner_label = away
    
    w_conf = int((winner_counts[best_winner_key] / ITERATIONS) * 100)
    
    # Goals Pred
    prob_over = over_2_5_count / ITERATIONS
    goals_label = "+2.5 Buts" if prob_over > 0.5 else "-2.5 Buts"
    goals_conf = int((prob_over if prob_over > 0.5 else 1 - prob_over) * 100)

    # Advice Logic
    advice = "Aucun"
    if winner_counts['1'] / ITERATIONS > 0.6: advice = f"Victoire {home}"
    elif winner_counts['2'] / ITERATIONS > 0.6: advice = f"Victoire {away}"
    elif (exp_h + exp_a) > 3.0: advice = "+2.5 Buts"
    elif winner_counts['N'] / ITERATIONS > 0.35: advice = "Match Nul Risqué"
    else: advice = "Les deux marquent (BTTS)"

    # Probabilities for UI
    probs = {
        '1': winner_counts['1'] / ITERATIONS,
        'N': winner_counts['N'] / ITERATIONS,
        '2': winner_counts['2'] / ITERATIONS
    }
    
    return {
        "score": best_score,
        "score_conf": int((score_counts[best_score] / ITERATIONS) * 100),
        "winner": winner_label,
        "winner_conf": w_conf,
        "goals_pred": goals_label,
        "goals_conf": goals_conf,
        "confidence": w_conf,
        "advice": advice,
        "probs": probs
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
    
    # Load PDF Calendar if available
    pdf_calendar_path = os.path.join(DATA_DIR, 'calendar.json')
    pdf_calendar = []
    if os.path.exists(pdf_calendar_path):
        with open(pdf_calendar_path, 'r') as f:
            pdf_calendar = json.load(f)
            
    # Calculate Match Weeks (Moved Up)
    all_season_matches.sort(key=lambda x: x['date'])
    team_games = {t: 0 for t in teams_list}
    export_matches = []
    
    for m in all_season_matches:
        h, a = m['home_team'], m['away_team']
        # The matchweek is roughly max(games_h, games_a) + 1
        week = max(team_games.get(h,0), team_games.get(a,0)) + 1
        
        # update
        team_games[h] = team_games.get(h,0) + 1
        team_games[a] = team_games.get(a,0) + 1
        
        m_copy = m.copy()
        m_copy['week'] = week
        export_matches.append(m_copy)

    # Determine Current Week
    current_week = max(team_games.values()) if team_games else 1
    next_week = current_week + 1
    
    # 3. Generate Future Matches (Next Week)
    next_matches = []
    
    # Try to find next week in PDF Calendar
    calendar_next_week = [m for m in pdf_calendar if m['week'] == next_week]
    
    # ... (rest of logic remains same)    
    # Try to find next week in PDF Calendar
    calendar_next_week = [m for m in pdf_calendar if m['week'] == next_week]
    
    if calendar_next_week:
        print(f"Using PDF Calendar for J{next_week} ({len(calendar_next_week)} matches)")
        future_date = (datetime.now() + timedelta(days=3)).strftime("%Y-%m-%d")
        
        for m in calendar_next_week:
            h, a = m['home_team'], m['away_team']
            if h in final_stats and a in final_stats: # Verify teams exist
                pred = predict_one_match(h, a, final_stats)
                m_obj = {
                    "id": random.randint(10000, 99999),
                    "homeTeam": h,
                    "awayTeam": a,
                    "date": future_date, # PDF doesn't always have exact date, use estimated
                    "week": next_week,
                    "odds": {
                        "home": round(1/max(0.05, pred['probs']['1']) * 0.92, 2),
                        "draw": round(1/max(0.05, pred['probs']['N']) * 0.92, 2),
                        "away": round(1/max(0.05, pred['probs']['2']) * 0.92, 2)
                    },
                    "prediction": pred
                }
                next_matches.append(m_obj)
    
    # Fallback to Random if PDF empty or week not found
    if not next_matches:
        print("PDF Calendar missing for next week. Using Random Falback.")
        teams_playing = list(teams_list)
        random.shuffle(teams_playing)
        start_next_date = (datetime.now() + timedelta(days=3)).strftime("%Y-%m-%d")
        
        while len(teams_playing) >= 2:
            h = teams_playing.pop()
            a = teams_playing.pop()
            pred = predict_one_match(h, a, final_stats)
            next_matches.append({
                "id": random.randint(10000, 99999),
                "homeTeam": h,
                "awayTeam": a,
                "date": start_next_date,
                "odds": {"home": 2.5, "draw": 3.2, "away": 2.8},
                "prediction": pred
            })
            
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

    # --- 3. BUILD FULL SCHEDULE (Past + Future) ---
    full_schedule = []
    
    # A. Add Played Matches
    for m in export_matches:
        full_schedule.append({
            "id": f"played_{m['home_team']}_{m['away_team']}",
            "homeTeam": m['home_team'],
            "awayTeam": m['away_team'],
            "week": m['week'],
            "date": m['date'],
            "status": "FINISHED",
            "score": { "home": m['full_time_home_goals'], "away": m['full_time_away_goals'] },
            "prediction": None # No prediction needed for past
        })

    # B. Add Future Matches (Imported Calendar + Fallback Simulation)
    
    # Identify what has been played (Exact Home/Away pairs)
    played_pairs = set()
    for m in full_schedule:
        played_pairs.add((m['homeTeam'], m['awayTeam']))
    
    # Find max week played
    last_played_week = max([m['week'] for m in full_schedule]) if full_schedule else 0
    start_sim_week = last_played_week + 1
    
    # 1. Integrate Imported Calendar matches first
    imported_matches_count = 0
    if pdf_calendar: # Variable name from loading line 125, let's keep it or rename it there too? 
                     # I will rename it locally to imported_calendar for clarity but I need to check where it came from.
                     # It came from: pdf_calendar = load_json(CALENDAR_PATH)
        imported_calendar = pdf_calendar 
        print(f"Integrating Imported Calendar matches...")
        for m in imported_calendar:
            h, a = m['home_team'], m['away_team']
            week = m['week']
            
            # Use Imported week if explicitly > last_played_week
            # Order matters: (h, a)
            
            if week > last_played_week and (h, a) not in played_pairs:
                if h in final_stats and a in final_stats:
                    pred = predict_one_match(h, a, final_stats)
                    est_date = (datetime.now() + timedelta(days=(week - last_played_week)*7)).strftime("%Y-%m-%d")
                    
                    full_schedule.append({
                        "id": f"fix_ext_{h}_{a}", "homeTeam": h, "awayTeam": a,
                        "week": week, "date": est_date, "status": "SCHEDULED",
                        "score": None, "prediction": pred
                    })
                    played_pairs.add((h, a))
                    imported_matches_count += 1
    
    # 2. Fill REmaining Weeks (up to 34) with Synthetic Round Robin
    
    print(f"Added {imported_matches_count} future matches from Import. Filling rest of season...")
    
    if len(teams_list) % 2 != 0: teams_list.append("Bye")
    n_teams = len(teams_list)
    anchor = teams_list[0]
    rotating = teams_list[1:]
    
    
    # Standard RR algorithm generates (N-1) rounds
    rr_schedule = []
    # Phase 1: First Leg
    for i in range(n_teams - 1):
        round_matches = []
        full_round = [anchor] + rotating
        for j in range(n_teams // 2):
            t1 = full_round[j]
            t2 = full_round[n_teams - 1 - j]
            if t1 != "Bye" and t2 != "Bye" and t1 != t2:
                 round_matches.append((t1, t2))
        rr_schedule.append(round_matches)
        rotating = [rotating[-1]] + rotating[:-1]
        
    # Phase 2: Return Leg
    phase1_rounds = list(rr_schedule)
    for r in phase1_rounds:
        inverted_round = [(a, h) for (h, a) in r]
        rr_schedule.append(inverted_round)
    
    # Try to fit these rounds into weeks that need matches
    # Force fill until we have (n_teams * (n_teams-1)) matches = 306 for 18 teams
    
    total_matches_target = n_teams * (n_teams - 1)
    
    # Flatten RR schedule into a list of matches
    all_possible_matches = []
    for r in rr_schedule:
        for m in r:
            all_possible_matches.append(m)
            
    # Filter out what's already played
    matches_to_schedule = []
    for h, a in all_possible_matches:
        if (h, a) not in played_pairs and (h, a) not in matches_to_schedule: 
             matches_to_schedule.append((h, a))

             
    print(f"Need to schedule {len(matches_to_schedule)} matches to reach season end.")
    
    # Distribute them over remaining weeks
    # We have weeks from start_sim_week to 34
    
    # 1. Build a map of Teams Active per Week based on current full_schedule (PDF data)
    teams_active_per_week = {}
    for w in range(1, 40): teams_active_per_week[w] = set()
    
    for m in full_schedule:
        w = m['week']
        if w not in teams_active_per_week: teams_active_per_week[w] = set()
        teams_active_per_week[w].add(m['homeTeam'])
        teams_active_per_week[w].add(m['awayTeam'])
    
    current_w = start_sim_week
    
    for h, a in matches_to_schedule:
        # Find the first week where BOTH teams are free
        scheduled_week = -1
        
        # Try finding a slot starting from current_w, wrapping/extending if needed
        # We try strict sequential filling to keep calendar compact
        
        test_w = current_w
        attempts = 0
        while attempts < 20: # Do not look too far ahead to avoid fragmentation
            if h not in teams_active_per_week[test_w] and a not in teams_active_per_week[test_w]:
                # Found a slot!
                scheduled_week = test_w
                break
            test_w += 1
            if test_w not in teams_active_per_week: teams_active_per_week[test_w] = set()
            attempts += 1
            
        if scheduled_week == -1:
             # Could not find slot in near future? Force to current_w + random (should not happen often)
             scheduled_week = current_w + 1
             
        # Apply Match
        pred = predict_one_match(h, a, final_stats)
        est_date = (datetime.now() + timedelta(days=(scheduled_week - last_played_week)*7)).strftime("%Y-%m-%d")
        
        full_schedule.append({
            "id": f"fix_sim_{h}_{a}", "homeTeam": h, "awayTeam": a,
            "week": scheduled_week, "date": est_date, "status": "SCHEDULED",
            "score": None, "prediction": pred
        })
        
        if scheduled_week not in teams_active_per_week: teams_active_per_week[scheduled_week] = set()
        teams_active_per_week[scheduled_week].add(h)
        teams_active_per_week[scheduled_week].add(a)
        
        # Advance current pivot if this week is getting full (18 teams -> 9 matches)
        if len(teams_active_per_week[current_w]) >= 18:
            current_w += 1

            

    # Sort full schedule
    full_schedule.sort(key=lambda x: (x['week'], x['id']))

    # 4. Standings are essentially just a view on this schedule
    # ... (Keeping existing standings logic for initial view)

    # Save Everything
    full_data = {
        "seasonStats": season_stats,
        "nextMatches": next_matches, # Keep for backward compat for now
        "standings": standings_list,
        "teamStats": final_stats,
        "currentWeek": current_week,
        "fullSchedule": full_schedule # THE SOURCE OF TRUTH
    }
    
    with open(os.path.join(DATA_DIR, 'app_data.json'), 'w') as f:
        json.dump(full_data, f, indent=2)
        
    print(f"Generated Full Data: {len(full_schedule)} matches total.")


if __name__ == "__main__":
    main()
