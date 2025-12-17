import pandas as pd
import json
import os

# Mapping placeholder - User should update this with actual mappings
TEAM_MAPPING = {
    "Paris SG": "PSG",
    "Marseille": "Marseille",
    "Lyon": "Lyon",
    "Monaco": "Monaco",
    "Lille": "Lille",
    "Lens": "Lens"
}

def get_football_data_legacy(start_year, end_year):
    print("   Downloading Football-Data.co.uk (Legacy)...")
    # Mapping colonnes CSV Legacy
    COLUMN_MAPPING = {
        'Div': 'division', 'Date': 'date', 'Time': 'time',
        'HomeTeam': 'home_team', 'AwayTeam': 'away_team', 'Referee': 'referee',
        'FTHG': 'full_time_home_goals', 'FTAG': 'full_time_away_goals', 'FTR': 'full_time_result',
        'HTHG': 'half_time_home_goals', 'HTAG': 'half_time_away_goals', 'HTR': 'half_time_result',
        'HS': 'home_shots', 'AS': 'away_shots', 'HST': 'home_shots_on_target', 'AST': 'away_shots_on_target',
        'HF': 'home_fouls', 'AF': 'away_fouls', 'HC': 'home_corners', 'AC': 'away_corners',
        'HY': 'home_yellow_cards', 'AY': 'away_yellow_cards', 'HR': 'home_red_cards', 'AR': 'away_red_cards',
        'B365H': 'bet365_home_win_odds', 'B365D': 'bet365_draw_odds', 'B365A': 'bet365_away_win_odds',
        'PSH': 'pinnacle_home_win_odds', 'PSD': 'pinnacle_draw_odds', 'PSA': 'pinnacle_away_win_odds'
    }
    
    all_data = []
    valid_cols = list(set(COLUMN_MAPPING.values())) + ['season', 'division']
    
    for year in range(start_year, end_year + 1):
        code = f"{str(year)[-2:]}{str(year+1)[-2:]}"
        season_label = f"{year}-{year+1}"
        url = f"https://www.football-data.co.uk/mmz4281/{code}/F1.csv"
        try:
            print(f"Fetching {url}...")
            df = pd.read_csv(url, encoding='latin-1', on_bad_lines='skip')
            df = df.rename(columns=COLUMN_MAPPING)
            df = df.assign(season=season_label, division='Ligue 1')
            
            # Harmonisation Date
            df['date'] = pd.to_datetime(df['date'], dayfirst=True, errors='coerce').dt.date.astype(str)
            
            # Nettoyage Colonnes
            cols_to_keep = [c for c in df.columns if c in valid_cols]
            df = df[cols_to_keep]
            
            if not df.empty:
                # Application Mapping Noms Equipes
                # Note: Assuming TEAM_MAPPING is defined globally or passed in
                if 'home_team' in df.columns:
                    df['home_team'] = df['home_team'].map(TEAM_MAPPING).fillna(df['home_team'])
                if 'away_team' in df.columns:
                    df['away_team'] = df['away_team'].map(TEAM_MAPPING).fillna(df['away_team'])
                all_data.append(df)
        except Exception as e: 
            print(f"Error processing {year}: {e}")
            pass
        
    if all_data: return pd.concat(all_data, ignore_index=True)
    return pd.DataFrame()

if __name__ == "__main__":
    # Fetch last 3 seasons: 23-24, 24-25, 25-26
    # Passing 2025 will generate url with code '2526'
    df = get_football_data_legacy(2023, 2025)
    if not df.empty:
        output_path = os.path.join(os.path.dirname(__file__), '..', 'src', 'data', 'matches_legacy.json')
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        # Convert to JSON records
        df.to_json(output_path, orient='records', indent=2)
        print(f"Data saved to {output_path}")
    else:
        print("No data fetched.")
