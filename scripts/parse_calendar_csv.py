import csv
import json
import os
import sys

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV_PATH = os.path.join(BASE_DIR, "src", "data", "ligue1_calendar.csv")
OUTPUT_PATH = os.path.join(BASE_DIR, "src", "data", "calendar.json")

# Team Mapping (CSV Name -> App Name)
TEAM_MAPPING = {
    "Stade Rennais FC": "Rennes",
    "Olympique de Marseille": "Marseille",
    "Paris Saint-Germain": "PSG",
    "RC Lens": "Lens",
    "Olympique Lyonnais": "Lyon",
    "AS Monaco": "Monaco",
    "Havre Athletic Club": "Le Havre",
    "OGC Nice": "Nice",
    "Toulouse FC": "Toulouse",
    "FC Nantes": "Nantes",
    "RC Strasbourg Alsace": "Strasbourg",
    "LOSC Lille": "Lille",
    "Angers SCO": "Angers",
    "AJ Auxerre": "Auxerre",
    "AS Saint-Étienne": "Saint-Etienne",
    "Montpellier Hérault SC": "Montpellier",
    "Stade de Reims": "Reims",
    "Stade Brestois 29": "Brest",
    "FC Metz": "Metz",
    "FC Lorient": "Lorient",
    "Paris FC": "Paris FC",
    "Clermont Foot 63": "Clermont",
    "FC Girondins de Bordeaux": "Bordeaux"
}

def normalize_team(name):
    # Try exact match
    if name in TEAM_MAPPING:
        return TEAM_MAPPING[name]
    # Fallback: fuzzy or partial?
    # For now, return as is (maybe strip whitespace)
    return name.strip()

def main():
    if not os.path.exists(CSV_PATH):
        print(f"Error: CSV file not found at {CSV_PATH}")
        sys.exit(1)
        
    print(f"Reading CSV Calendar from {CSV_PATH}...")
    
    matches = []
    
    with open(CSV_PATH, 'r', encoding='utf-8', errors='replace') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # CSV Columns: Match Number,Round Number,Date,Location,Home Team,Away Team,Result
            
            try:
                week = int(row["Round Number"])
                home_raw = row["Home Team"]
                away_raw = row["Away Team"]
                
                matches.append({
                    "week": week,
                    "home_team": normalize_team(home_raw),
                    "away_team": normalize_team(away_raw),
                    "source": "CSV"
                })
            except (ValueError, KeyError) as e:
                print(f"Skipping row due to error: {row} ({e})")
                continue
                
    print(f"Extracted {len(matches)} matches from CSV.")
    
    # Save to JSON
    with open(OUTPUT_PATH, 'w') as f:
        json.dump(matches, f, indent=2)
    
    print(f"Saved to {OUTPUT_PATH}")

if __name__ == "__main__":
    main()
