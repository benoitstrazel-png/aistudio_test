import pandas as pd
import requests
import time
import os
import json
from datetime import datetime

# --- CONFIGURATION ---
SEASON = "2025-2026"
LIGUE_1_ID = "13" # FBref ID for Ligue 1
BASE_URL = "https://fbref.com/en/comps/13/schedule/Ligue-1-Scores-and-Fixtures"
STATS_URL = "https://fbref.com/en/comps/13/stats/Ligue-1-Stats"
DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'src', 'data')

def clean_team_name(name):
    """Normalize team names to match our internal IDs"""
    name = name.replace("Paris S-G", "PSG") \
               .replace("Paris Saint-Germain", "PSG") \
               .replace("Olympique Marseille", "Marseille") \
               .replace("Olympique Lyonnais", "Lyon") \
               .replace("AS Monaco", "Monaco") \
               .replace("Lille OSC", "Lille") \
               .replace("RC Lens", "Lens")
    return name

def scrape_fixtures():
    print(f"--- Scraping Fixtures from {BASE_URL} ---")
    try:
        # Use pandas read_html which is powerful for tables
        # We need a user-agent to avoid immediate blocking
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
        resp = requests.get(BASE_URL, headers=headers)
        
        if resp.status_code != 200:
            print(f"Failed to fetch page: {resp.status_code}")
            return None

        dfs = pd.read_html(resp.text)
        # The fixtures table is usually the first one or named "Scores & Fixtures"
        df = dfs[0]
        
        # Clean up
        df = df.dropna(subset=['Home', 'Away']) # Remove empty rows
        df = df[df['Date'].notna()] # Remove dividers
        
        # Select and Rename columns
        cols = {
            'Wk': 'week', 'Day': 'day', 'Date': 'date', 'Time': 'time',
            'Home': 'home_team', 'Score': 'score', 'Away': 'away_team',
            'Attendance': 'attendance', 'Venue': 'venue', 'Referee': 'referee'
        }
        df = df.rename(columns=cols)
        
        # Normalize names
        df['home_team'] = df['home_team'].apply(clean_team_name)
        df['away_team'] = df['away_team'].apply(clean_team_name)
        
        # Add status
        def get_status(score):
            if pd.isna(score) or "–" in str(score): return "SCHEDULED"
            return "FINISHED"
            
        df['status'] = df['score'].apply(get_status)
        
        # Parse score
        def parse_score(score, side):
            if pd.isna(score) or "–" in str(score): return None
            try:
                parts = str(score).split('–')
                return int(parts[0]) if side == 'home' else int(parts[1])
            except: return None

        df['home_goals'] = df.apply(lambda x: parse_score(x['score'], 'home'), axis=1)
        df['away_goals'] = df.apply(lambda x: parse_score(x['score'], 'away'), axis=1)
        
        # Filter relevant columns for export
        final_df = df[['week', 'date', 'time', 'home_team', 'away_team', 'score', 'status', 'home_goals', 'away_goals']]
        
        print(f"Found {len(final_df)} matches.")
        return final_df

    except Exception as e:
        print(f"Error scraping fixtures: {e}")
        return None

def scrape_players():
    print(f"--- Scraping Player Stats from {STATS_URL} ---")
    try:
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
        # Sleep to be polite
        time.sleep(3) 
        resp = requests.get(STATS_URL, headers=headers)
        
        dfs = pd.read_html(resp.content)
        # Player stats is usually the first big table
        df = dfs[0]
        
        # Flatten multi-level columns if they exist
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = ['_'.join(col).strip() for col in df.columns.values]
            
        # Identify columns (names might change slightly on FBref, usage loose matching)
        # Expected: Player, Squad, Age, ... Performance_Gls, Performance_Ast
        
        # Rename vital columns
        # Note: Column names after flattening look like 'Unnamed: 0_level_0_Rk', 'Unnamed: 1_level_0_Player', etc.
        # Or 'Performance_Gls', 'Performance_Ast'
        
        rename_map = {}
        for col in df.columns:
            if 'Player' in col: rename_map[col] = 'name'
            if 'Squad' in col: rename_map[col] = 'team'
            if 'Pos' in col: rename_map[col] = 'position'
            if 'Gls' in col and 'Performance' in col: rename_map[col] = 'goals'
            if 'Ast' in col and 'Performance' in col: rename_map[col] = 'assists'
            if 'CrdY' in col and 'Performance' in col: rename_map[col] = 'yellow_cards'
            if 'CrdR' in col and 'Performance' in col: rename_map[col] = 'red_cards'
            if 'Min' in col and 'Playing Time' in col: rename_map[col] = 'minutes'
            
        df = df.rename(columns=rename_map)
        
        # Filter to keep only rows with actual inputs (remove headers repeated in table)
        df = df[df['name'] != 'Player']
        df = df.dropna(subset=['name'])
        
        # Normalize Team Names
        df['team'] = df['team'].apply(lambda x: clean_team_name(str(x)))
        
        # Convert numeric
        for col in ['goals', 'assists', 'yellow_cards', 'red_cards', 'minutes']:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
                
        # Select final columns
        keep_cols = ['name', 'team', 'position', 'goals', 'assists', 'yellow_cards', 'red_cards', 'minutes']
        final_df = df[[c for c in keep_cols if c in df.columns]]
        
        print(f"Found {len(final_df)} players.")
        return final_df
        
    except Exception as e:
        print(f"Error scraping players: {e}")
        return None

def main():
    os.makedirs(DATA_DIR, exist_ok=True)
    
    # 1. Scrape Fixtures
    fixtures = scrape_fixtures()
    if fixtures is not None:
        fixtures.to_json(os.path.join(DATA_DIR, 'fixtures.json'), orient='records', indent=2)
        print("Fixtures saved to fixtures.json")
    
    # 2. Scrape Players
    players = scrape_players()
    if players is not None:
        players.to_json(os.path.join(DATA_DIR, 'players.json'), orient='records', indent=2)
        print("Players saved to players.json")
        
        # OPTIONAL: BigQuery Upload
        bq_creds = os.path.join(os.path.dirname(__file__), '..', 'credentials.json')
        if os.path.exists(bq_creds):
            print("Credentials found. Uploading to BigQuery...")
            try:
                from google.cloud import bigquery
                from google.oauth2 import service_account
                
                credentials = service_account.Credentials.from_service_account_file(bq_creds)
                client = bigquery.Client(credentials=credentials, project=credentials.project_id)
                
                # Assume dataset 'ligue1_data' and table 'players_live'
                table_id = f"{client.project}.ligue1_data.players_live"
                
                job_config = bigquery.LoadJobConfig(
                    write_disposition="WRITE_TRUNCATE", # Replace old data
                )
                
                job = client.load_table_from_dataframe(players, table_id, job_config=job_config)
                job.result() 
                print(f"Uploaded {len(players)} rows to {table_id}")
                
            except ImportError:
                print("google-cloud-bigquery not installed. Skipping upload.")
            except Exception as e:
                print(f"BigQuery Upload failed: {e}")
        else:
            print("No credentials.json found. Skipping BigQuery upload.")

if __name__ == "__main__":
    main()
