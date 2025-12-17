import pandas as pd
import requests
import time
import os
import json
from bs4 import BeautifulSoup

# --- CONFIGURATION ---
BASE_URL_WIKI = "https://fr.wikipedia.org/wiki/Saison_2025-2026_de_Ligue_1"
STATS_URL_FBREF = "https://fbref.com/en/comps/13/stats/Ligue-1-Stats"
DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'src', 'data')

def clean_team_name(name):
    """Normalize team names commonly found on Wikipedia/FBref"""
    if pd.isna(name): return ""
    name = str(name).strip()
    name = name.replace("Paris Saint-Germain", "PSG") \
               .replace("Paris SG", "PSG") \
               .replace("Olympique de Marseille", "Marseille") \
               .replace("Olympique lyonnais", "Lyon") \
               .replace("AS Monaco", "Monaco") \
               .replace("LOSC Lille", "Lille") \
               .replace("Lille OSC", "Lille") \
               .replace("RC Lens", "Lens") \
               .replace("Stade brestois 29", "Brest") \
               .replace("OGC Nice", "Nice") \
               .replace("Stade rennais FC", "Rennes") \
               .replace("Stade de Reims", "Reims")
    return name

def scrape_fixtures_wikipedia():
    print(f"--- Scraping Fixtures from {BASE_URL_WIKI} ---")
    try:
        resp = requests.get(BASE_URL_WIKI)
        if resp.status_code != 200:
            print(f"Wikipedia page not found ({resp.status_code}). Trying 2024-2025...")
            resp = requests.get("https://fr.wikipedia.org/wiki/Saison_2024-2025_de_Ligue_1")
        
        soup = BeautifulSoup(resp.content, 'html.parser')
        
        # Wikipedia fixtures are often in a big matrix table or match-by-match list
        # We look for the "Calendrier" or "Résultats" table
        # Strategy: Look for the big results matrix (Home/Away)
        
        dfs = pd.read_html(str(soup))
        fixtures_list = []
        
        # We try to identify the results matrix (usually ~18x18)
        matrix_df = None
        for df in dfs:
            if df.shape[0] > 15 and df.shape[1] > 15: # Likely the grid
                # Check if diagonals are dividers
                matrix_df = df
                break
                
        if matrix_df is not None:
            print("Found Results Matrix. Parsing...")
            # The first column usually contains Home team names
            teams = matrix_df.iloc[:, 0].tolist()
            headers = matrix_df.columns.tolist() # Away teams
            
            # The matrix intersects
            # Row i (Home) vs Col j (Away)
            for i in range(len(matrix_df)):
                home_team = clean_team_name(matrix_df.iloc[i, 0])
                if not home_team or len(home_team) > 30: continue
                
                for j in range(1, len(matrix_df.columns)):
                    score = matrix_df.iloc[i, j]
                    away_team = clean_team_name(headers[j])
                    
                    if pd.isna(score) or score == "nan": continue
                    
                    # Score format is usually "1-0" or "J14" (for future)
                    status = "SCHEDULED"
                    hg, ag = None, None
                    
                    if "-" in str(score) and len(str(score)) < 6: # Likely a score
                        try:
                            parts = str(score).split("-")
                            hg = int(parts[0])
                            ag = int(parts[1])
                            status = "FINISHED"
                        except: pass
                    else:
                        # Sometimes it's the matchday number like "J23"
                        status = "SCHEDULED"
                        
                    if home_team != away_team: # Avoid diagonal
                        match = {
                            "home_team": home_team,
                            "away_team": away_team,
                            "score": score if status == "FINISHED" else None,
                            "home_goals": hg,
                            "away_goals": ag,
                            "status": status,
                            "date": "2025-01-01" # Wiki matrix doesn't match dates easily
                        }
                        fixtures_list.append(match)
                        
        print(f"Parsed {len(fixtures_list)} matches from Matrix.")
        return pd.DataFrame(fixtures_list)
        
    except Exception as e:
        print(f"Error scraping Wiki: {e}")
        return None

def scrape_players_fbref():
    print(f"--- Scraping Player Stats from {STATS_URL_FBREF} ---")
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
        }
        time.sleep(2)
        resp = requests.get(STATS_URL_FBREF, headers=headers)
        
        if resp.status_code == 429:
            print("Rate limited (429). Waiting 10s...")
            time.sleep(10)
            resp = requests.get(STATS_URL_FBREF, headers=headers)
            
        if resp.status_code != 200:
            print(f"Failed to fetch FBref: {resp.status_code}")
            return None
            
        dfs = pd.read_html(resp.content, flavor='bs4') # Use bs4/html5lib
        df = dfs[0]
        
        # Flatten MultiIndex
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = ['_'.join(c).strip() for c in df.columns]
            
        # Basic Rename (adapt based on observed columns)
        # FBref col names roughly: 'Unnamed: 0_level_0_Rk', 'Unnamed: 1_level_0_Player', ... 'Performance_Gls'
        rename_map = {}
        for c in df.columns:
            if 'Player' in c: rename_map[c] = 'name'
            if 'Squad' in c: rename_map[c] = 'team'
            if 'Pos' in c: rename_map[c] = 'position'
            if 'Gls' in c and 'Performance' in c: rename_map[c] = 'goals'
            if 'Ast' in c and 'Performance' in c: rename_map[c] = 'assists'
            
        df = df.rename(columns=rename_map)
        df = df[df['name'] != 'Player'] # remove headers
        
        # Fill numeric
        df['goals'] = pd.to_numeric(df['goals'], errors='coerce').fillna(0)
        df['assists'] = pd.to_numeric(df['assists'], errors='coerce').fillna(0)
        
        print(f"Scraped {len(df)} players.")
        return df[['name', 'team', 'position', 'goals', 'assists']]
        
    except Exception as e:
        print(f"Error scraping FBref players: {e}")
        return None

def main():
    os.makedirs(DATA_DIR, exist_ok=True)
    
    # 1. Matches
    fixtures = scrape_fixtures_wikipedia()
    if fixtures is not None and not fixtures.empty:
        fixtures.to_json(os.path.join(DATA_DIR, 'fixtures.json'), orient='records', indent=2)
    else:
        print("Using Mock Fixtures (Scrape failed)")
        # Fallback empty or mock
        
    # 2. Players
    players = scrape_players_fbref()
    if players is not None and not players.empty:
        players.to_json(os.path.join(DATA_DIR, 'players.json'), orient='records', indent=2)
        
        # BigQuery Upload
        try:
            bq_creds = os.path.join(os.path.dirname(__file__), '..', 'credentials.json')
            if os.path.exists(bq_creds):
                from google.cloud import bigquery
                from google.oauth2 import service_account
                creds = service_account.Credentials.from_service_account_file(bq_creds)
                client = bigquery.Client(credentials=creds, project=creds.project_id)
                
                # Check if dataset exists, if not create
                dataset_id = f"{client.project}.ligue1_data"
                dataset = bigquery.Dataset(dataset_id)
                dataset.location = "EU"
                try:
                    client.create_dataset(dataset, timeout=30)
                except: pass # Exists
                
                table_id = f"{dataset_id}.players_live"
                job = client.load_table_from_dataframe(players, table_id)
                job.result()
                print("Uploaded to BigQuery.")
        except Exception as e:
            print(f"BigQuery skipped: {e}")

if __name__ == "__main__":
    main()
