import pdfplumber
import json
import os
import re

PDF_PATH = os.path.join(os.path.dirname(__file__), '..', 'src', 'data', 'ligue1_calendar.pdf')
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), '..', 'src', 'data', 'calendar.json')
MATCHES_REAL_PATH = os.path.join(os.path.dirname(__file__), '..', 'src', 'data', 'matches_legacy.json')

# Standardized Team Names (Must match your CSV/App data)
TEAMS_MAP = {
    "PSG": "PSG", "PARIS": "PSG", "PARIS SG": "PSG", "PARIS SAINT-GERMAIN": "PSG",
    "MARSEILLE": "Marseille", "OM": "Marseille", "OLYMPIQUE DE MARSEILLE": "Marseille",
    "LYON": "Lyon", "OL": "Lyon", "OLYMPIQUE LYONNAIS": "Lyon",
    "MONACO": "Monaco", "ASM": "Monaco", "AS MONACO": "Monaco",
    "LILLE": "Lille", "LOSC": "Lille",
    "LENS": "Lens", "RC LENS": "Lens",
    "RENNES": "Rennes", "NO": "Rennes", "STADE RENNAIS": "Rennes",
    "NICE": "Nice", "OGC NICE": "Nice",
    "BREST": "Brest", "STADE BRESTOIS": "Brest", 
    "REIMS": "Reims", "STADE DE REIMS": "Reims",
    "STRASBOURG": "Strasbourg", "RCSA": "Strasbourg",
    "TOULOUSE": "Toulouse", "TFC": "Toulouse",
    "MONTPELLIER": "Montpellier", "MHSC": "Montpellier",
    "NANTES": "Nantes", "FC NANTES": "Nantes",
    "LE HAVRE": "Le Havre", "HAC": "Le Havre",
    "AUXERRE": "Auxerre", "AJA": "Auxerre",
    "SAINT-ETIENNE": "St Etienne", "ASSE": "St Etienne", "ST ETIENNE": "St Etienne",
    "ANGERS": "Angers", "SCO": "Angers"
}

def normalize_team(text):
    text = text.upper().strip()
    for key, val in TEAMS_MAP.items():
        # Match exact words or robust check
        if key in text: # Simplistic, might be dangerous (e.g. "Stade" matches multiple)
             # Better: Split words and check intersection
             pass
    
    # Reverse lookup by longest key match
    best_match = None
    max_len = 0
    
    for key, val in TEAMS_MAP.items():
        if key in text and len(key) > max_len:
            best_match = val
            max_len = len(key)
            
    return best_match

def parse_pdf():
    if not os.path.exists(PDF_PATH):
        print(f"PDF not found at {PDF_PATH}. Please place 'ligue1_calendar.pdf' in src/data/")
        return

    matches = []
    
    # 1. Identify active teams first to reduce false positives
    # We can use the legacy matches file to know exactly which 18 teams are in L1 this year
    valid_teams = set()
    if os.path.exists(MATCHES_REAL_PATH):
        with open(MATCHES_REAL_PATH, 'r') as f:
            legacy = json.load(f)
            # Filter 2025-2026
            for m in legacy:
                if '2025' in str(m.get('season','')) or '2026' in str(m.get('season','')):
                    valid_teams.add(m.get('home_team'))
                    valid_teams.add(m.get('away_team'))
    
    print(f"Parsing PDF... Looking for {len(valid_teams)} valid teams.")
    
    with pdfplumber.open(PDF_PATH) as pdf:
        full_text = ""
        for page in pdf.pages:
            full_text += page.extract_text() + "\n"
            
    # Simple Heuristic Parser
    # Calendars usually structured as:
    # "J1 - 18 AOUT 2025" ... followed by matches
    # or a Grid
    
    # Let's try line by line match detection
    lines = full_text.split('\n')
    current_day = "Unknown"
    
    for line in lines:
        line_u = line.upper()
        
        # Detect Matchday Header
        # Patterns: "J17", "JOURNEE 17", "WEEK 17"
        match_day_std = re.search(r'\b(J|JOURNEE|WEEK)\s*(\d{1,2})\b', line_u)
        
        # Pattern: "17EME JOURNEE", "1ER JOURNEE" (Ordinal first)
        match_day_ord = re.search(r'\b(\d{1,2})\s*(?:ER|ERE|EME|ÈME)?\s*JOURN', line_u)
        
        if match_day_std:
            current_day = f"J{match_day_std.group(2)}"
        elif match_day_ord:
            current_day = f"J{match_day_ord.group(1)}"
            
        # Detect 2 Teams in the line
            
        # Detect 2 Teams in the line
        # We search for occurrences of our Team Names
        found_teams = []
        
        # Sort keys by length so "Paris SG" is found before "Paris"
        sorted_keys = sorted(TEAMS_MAP.keys(), key=len, reverse=True)
        
        temp_line = line_u
        
        row_teams = []
        for key in sorted_keys:
            if key in temp_line:
                # Check if it maps to a VALID team for this season
                team_std = TEAMS_MAP[key]
                if valid_teams and team_std not in valid_teams:
                    continue # Skip if it matches a mapped name but team is not in L1 this year (unlikely but safe)
                
                # Verify we haven't found this team already in this line
                if team_std not in row_teams:
                    row_teams.append(team_std)
                    # Remove from temp_line to avoid double match
                    temp_line = temp_line.replace(key, "", 1)
                    
        # If we found exactly 2 teams, it's likely a match
        if len(row_teams) == 2:
            # Check if likely header line or real match
            # "Classement Ligue 1" might contain terms but not 2 teams usually
            matches.append({
                "week": int(current_day.replace('J', '')) if current_day != 'Unknown' else 0,
                "home_team": row_teams[0], # PDF order often Home - Away or Left - Right
                "away_team": row_teams[1],
                "source": "PDF"
            })
            
        # If found > 2 (e.g. grid row with multiple matches), parse pairs?
        # Grid: "Team A - Team B    Team C - Team D"
        if len(row_teams) > 2 and len(row_teams) % 2 == 0:
            for i in range(0, len(row_teams), 2):
                matches.append({
                    "week": int(current_day.replace('J', '')) if current_day != 'Unknown' else 0,
                    "home_team": row_teams[i],
                    "away_team": row_teams[i+1],
                    "source": "PDF"
                })

    # Deduplicate
    unique_matches = []
    seen = set()
    # Keep order of extraction!
    for m in matches:
        uid = f"{sorted([m['home_team'], m['away_team']])}" # Id agnostic of order (and week for now)
        if uid not in seen:
            seen.add(uid)
            unique_matches.append(m)
            
    # POST-PROCESSING: Assign Weeks if missing
    # Ligue 1 has 9 matches per week usually (18 teams)
    # If we found 0 weeks or 'Unknown', let's auto-assign based on order
    
    weeks_found = set(m['week'] for m in unique_matches)
    if len(weeks_found) <= 1: # Only found 0 or 1 week type -> Parsing failed
        print("Week detection weak. Auto-assigning weeks based on 9 matches/block order.")
        
        matches_per_week = 9
        for i, m in enumerate(unique_matches):
            week_num = (i // matches_per_week) + 1
            # Adjust if we want to align with specific calendar start? 
            # Assuming PDF starts at J1 or J_Next
            # But the user said "Calendrier 2025-2026", so likely J1 start.
            
            # However, if PDF is only "Return Phase", it might start at J18.
            # Without knowing, J1 is safest guess, or we could ask user.
            # Let's assume J1.
            m['week'] = week_num

    print(f"Extracted {len(unique_matches)} matches from PDF.")
    
    with open(OUTPUT_PATH, 'w') as f:
        json.dump(unique_matches, f, indent=2)

if __name__ == "__main__":
    parse_pdf()
