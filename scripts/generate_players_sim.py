import json
import os
import random

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'src', 'data')
LEGACY_PATH = os.path.join(DATA_DIR, 'matches_legacy.json')

# Top players mapping (Manual Context)
REAL_PLAYERS = {
    "PSG": ["Mbappe", "Dembele", "Hakimi", "Donnarumma", "Zaire-Emery", "Marquinhos"],
    "Marseille": ["Aubameyang", "Clauss", "Veretout", "Harit", "Mbemba", "Lopez"],
    "Lyon": ["Lacazette", "Caqueret", "Cherki", "Tolisso", "Lopes", "O'Brien"],
    "Monaco": ["Ben Yedder", "Golovin", "Fofana", "Zakaria", "Kohn", "Vanderson"],
    "Lille": ["David", "Chevalier", "Yoro", "Andre", "Zhegrova", "Gomes"],
    "Lens": ["Samba", "Medina", "Sotoca", "Wahi", "Frankowski", "Gradit"],
    "Nice": ["Moffi", "Bulka", "Todibo", "Dante", "Thuram", "Laborde"],
    "Rennes": ["Bourigeaud", "Terrier", "Mandanda", "Kalimuendo", "Le Fee", "Theate"]
}

def generate_players():
    if not os.path.exists(LEGACY_PATH):
        print("Legacy data not found.")
        return

    with open(LEGACY_PATH, 'r') as f:
        matches = json.load(f)
        
    teams = set()
    for m in matches:
        if m.get('home_team'): teams.add(m['home_team'])
        if m.get('away_team'): teams.add(m['away_team'])
        
    players_list = []
    
    for team in teams:
        # Get real stars or generic names
        stars = REAL_PLAYERS.get(team, [])
        # Add 5 attackers/midfielders per team for the dashboard
        for i in range(5):
            if i < len(stars):
                name = stars[i]
            else:
                name = f"Joueur {team} {i+1}"
            
            # Simulate Form based on team name (PSG stronger)
            base_form = 7.0
            if team == "PSG": base_form = 8.5
            if team in ["Marseille", "Monaco", "Lille"]: base_form = 7.8
            
            form = min(10, max(4, base_form + random.uniform(-1.5, 1.5)))
            
            p_data = {
                "name": name,
                "team": team,
                "form": round(form, 1),
                "chanceGoal": int(form * 8) if i < 2 else int(form * 3), # Attackers have higher chance
                "chanceAssist": int(form * 6),
                "chanceCard": random.randint(5, 30),
                "status": "form" if form > 8 else "slump" if form < 6 else "neutral"
            }
            players_list.append(p_data)
            
    output_path = os.path.join(DATA_DIR, 'players.json')
    with open(output_path, 'w') as f:
        json.dump(players_list, f, indent=2)
    print(f"Generated {len(players_list)} players in {output_path}")

    # Also try BigQuery upload
    bq_creds = os.path.join(os.path.dirname(__file__), '..', 'credentials.json')
    if os.path.exists(bq_creds):
        try:
            import pandas as pd
            from google.cloud import bigquery
            from google.oauth2 import service_account
            
            df = pd.DataFrame(players_list)
            creds = service_account.Credentials.from_service_account_file(bq_creds)
            client = bigquery.Client(credentials=creds, project=creds.project_id)
            
            # Try to upload
            dataset_id = f"{client.project}.ligue1_data"
            table_id = f"{dataset_id}.players_bq"
            
            # Simple check/create dataset
            try: client.create_dataset(bigquery.Dataset(dataset_id))
            except: pass
            
            job = client.load_table_from_dataframe(df, table_id)
            job.result()
            print("Players uploaded to BigQuery successfully.")
            
        except ImportError:
            print("BigQuery libs missing.")
        except Exception as e:
            print(f"BigQuery failed: {e}")

if __name__ == "__main__":
    generate_players()
