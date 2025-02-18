package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"

	_ "github.com/mattn/go-sqlite3"
)

type Movie struct {
	ID     int    `json:"id"`
	Title  string `json:"title"`
	Rating string `json:"rating"`
}

type UserSettings struct {
	FilterRated bool `json:"filter_rated"`
}

var db *sql.DB

func initDB() {
	var err error
	db, err = sql.Open("sqlite3", "./movies.db")
	if err != nil {
		log.Fatal(err)
	}

	// Create movies table if it doesn't exist
	_, err = db.Exec(`CREATE TABLE IF NOT EXISTS movies (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		title TEXT,
		rating TEXT
	)`)
	if err != nil {
		log.Fatal(err)
	}

	// Insert sample data
	_, err = db.Exec(`INSERT OR IGNORE INTO movies (title, rating) VALUES
		('Inception', 'PG-13'),
		('The Matrix', 'R'),
		('Toy Story', 'G')`)
	if err != nil {
		log.Fatal(err)
	}
}

func listMovies(w http.ResponseWriter, r *http.Request) {
	userID := r.URL.Query().Get("user_id")
	if userID == "" {
		http.Error(w, "User ID is required", http.StatusBadRequest)
		return
	}

	// Call User Service to get user settings
	resp, err := http.Get(fmt.Sprintf("http://%s/settings?user_id=%s", os.Getenv("USER_SERVICE_DNS"), userID))
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to fetch user settings: %v", err), http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	var settings UserSettings
	if err := json.NewDecoder(resp.Body).Decode(&settings); err != nil {
		http.Error(w, "Failed to decode user settings", http.StatusInternalServerError)
		return
	}

	// Fetch movies from the database
	rows, err := db.Query("SELECT id, title, rating FROM movies")
	if err != nil {
		http.Error(w, "Failed to fetch movies", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var movies []Movie
	for rows.Next() {
		var movie Movie
		if err := rows.Scan(&movie.ID, &movie.Title, &movie.Rating); err != nil {
			http.Error(w, "Failed to scan movie", http.StatusInternalServerError)
			return
		}
		if !settings.FilterRated && movie.Rating != "R" {
			movies = append(movies, movie)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(movies)
}

func main() {
	initDB()
	http.HandleFunc("/movies", listMovies)
	log.Println("Movies service started on :8081")
	log.Fatal(http.ListenAndServe(":8081", nil))
}
