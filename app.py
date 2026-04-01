from flask import Flask, jsonify, render_template
import mysql.connector
from flask_cors import CORS

app = Flask(__name__)
CORS(app)


# ─── DATABASE CONNECTION ───────────────────────────────────────────────────────
def get_db():
    try:
        return mysql.connector.connect(
            host="localhost",
            user="root",
            password="Vinayak@07",
            database="music_analytics"
        )
    except Exception as e:
        print("Database connection failed:", e)
        return None


def db_error():
    return jsonify({"error": "Database connection failed"}), 500


# ─── PAGE ROUTES ──────────────────────────────────────────────────────────────
@app.route("/")
def home():
    return render_template("index.html")


@app.route("/admin")
def admin():
    return render_template("admin.html")


# ─── API: USERS ───────────────────────────────────────────────────────────────
@app.route("/api/users")
def get_users():
    db = get_db()
    if db is None:
        return db_error()
    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT * FROM users")
    data = cursor.fetchall()
    cursor.close()
    db.close()
    # Convert date objects to strings
    for row in data:
        if row.get("join_date"):
            row["join_date"] = str(row["join_date"])
    return jsonify(data)


# ─── API: SONGS ───────────────────────────────────────────────────────────────
@app.route("/api/songs")
def get_songs():
    db = get_db()
    if db is None:
        return db_error()
    cursor = db.cursor(dictionary=True)
    cursor.execute("""
        SELECT s.song_id, s.song_name, a.artist_name, al.album_name,
               s.duration,
               COUNT(lh.history_id) AS play_count
        FROM songs s
        JOIN artists a  ON s.artist_id = a.artist_id
        JOIN albums  al ON s.album_id  = al.album_id
        LEFT JOIN listening_history lh ON s.song_id = lh.song_id
        GROUP BY s.song_id, s.song_name, a.artist_name, al.album_name, s.duration
        ORDER BY play_count DESC
    """)
    data = cursor.fetchall()
    cursor.close()
    db.close()
    return jsonify(data)


# ─── API: ARTISTS ─────────────────────────────────────────────────────────────
@app.route("/api/artists")
def get_artists():
    db = get_db()
    if db is None:
        return db_error()
    cursor = db.cursor(dictionary=True)
    cursor.execute("""
        SELECT a.artist_id, a.artist_name,
               COUNT(DISTINCT s.song_id) AS total_songs,
               COUNT(lh.history_id)      AS total_plays
        FROM artists a
        LEFT JOIN songs s              ON a.artist_id = s.artist_id
        LEFT JOIN listening_history lh ON s.song_id   = lh.song_id
        GROUP BY a.artist_id, a.artist_name
        ORDER BY total_plays DESC
    """)
    data = cursor.fetchall()
    cursor.close()
    db.close()
    return jsonify(data)


# ─── API: ALBUMS ──────────────────────────────────────────────────────────────
@app.route("/api/albums")
def get_albums():
    db = get_db()
    if db is None:
        return db_error()
    cursor = db.cursor(dictionary=True)
    cursor.execute("""
        SELECT al.album_id, al.album_name, a.artist_name, al.release_year,
               COUNT(DISTINCT s.song_id) AS total_songs
        FROM albums al
        JOIN artists a ON al.artist_id = a.artist_id
        LEFT JOIN songs s ON al.album_id = s.album_id
        GROUP BY al.album_id, al.album_name, a.artist_name, al.release_year
        ORDER BY al.release_year DESC
    """)
    data = cursor.fetchall()
    cursor.close()
    db.close()
    return jsonify(data)


# ─── API: GENRES ──────────────────────────────────────────────────────────────
@app.route("/api/genres")
def get_genres():
    db = get_db()
    if db is None:
        return db_error()
    cursor = db.cursor(dictionary=True)
    cursor.execute("""
        SELECT g.genre_id, g.genre_name,
               COUNT(DISTINCT sg.song_id) AS total_songs,
               COUNT(lh.history_id)       AS total_plays
        FROM genres g
        LEFT JOIN song_genre sg        ON g.genre_id = sg.genre_id
        LEFT JOIN listening_history lh ON sg.song_id = lh.song_id
        GROUP BY g.genre_id, g.genre_name
        ORDER BY total_plays DESC
    """)
    data = cursor.fetchall()
    cursor.close()
    db.close()
    return jsonify(data)


# ─── API: TOTAL USERS ─────────────────────────────────────────────────────────
@app.route("/api/total-users")
def total_users():
    db = get_db()
    if db is None:
        return db_error()
    cursor = db.cursor()
    cursor.execute("SELECT COUNT(*) FROM users")
    count = cursor.fetchone()[0]
    cursor.close()
    db.close()
    return jsonify({"total_users": count})


# ─── API: TOTAL ARTISTS ───────────────────────────────────────────────────────
@app.route("/api/total-artists")
def total_artists():
    db = get_db()
    if db is None:
        return db_error()
    cursor = db.cursor()
    cursor.execute("SELECT COUNT(*) FROM artists")
    count = cursor.fetchone()[0]
    cursor.close()
    db.close()
    return jsonify({"total_artists": count})


# ─── API: TOTAL SONGS ─────────────────────────────────────────────────────────
@app.route("/api/total-songs")
def total_songs():
    db = get_db()
    if db is None:
        return db_error()
    cursor = db.cursor()
    cursor.execute("SELECT COUNT(*) FROM songs")
    count = cursor.fetchone()[0]
    cursor.close()
    db.close()
    return jsonify({"total_songs": count})


# ─── API: TOTAL STREAMS ───────────────────────────────────────────────────────
@app.route("/api/total-streams")
def total_streams():
    db = get_db()
    if db is None:
        return db_error()
    cursor = db.cursor()
    cursor.execute("SELECT COUNT(*) FROM listening_history")
    count = cursor.fetchone()[0]
    cursor.close()
    db.close()
    return jsonify({"total_streams": count})


# ─── API: MOST PLAYED SONG ───────────────────────────────────────────────────
@app.route("/api/most-played")
def most_played():
    db = get_db()
    if db is None:
        return db_error()
    cursor = db.cursor(dictionary=True)
    cursor.execute("""
        SELECT s.song_name, COUNT(*) AS plays
        FROM listening_history lh
        JOIN songs s ON lh.song_id = s.song_id
        GROUP BY s.song_name
        ORDER BY plays DESC
        LIMIT 1
    """)
    result = cursor.fetchone()
    cursor.close()
    db.close()
    return jsonify(result if result else {})


# ─── API: LISTENING TRENDS ───────────────────────────────────────────────────
@app.route("/api/listening-trends")
def listening_trends():
    db = get_db()
    if db is None:
        return db_error()
    cursor = db.cursor(dictionary=True)
    cursor.execute("""
        SELECT DATE(play_time) AS day, COUNT(*) AS plays
        FROM listening_history
        GROUP BY day
        ORDER BY day
    """)
    result = cursor.fetchall()
    cursor.close()
    db.close()
    for row in result:
        if row.get("day"):
            row["day"] = str(row["day"])
    return jsonify(result)


# ─── API: TOP ARTIST ─────────────────────────────────────────────────────────
@app.route("/api/top-artist")
def top_artist():
    db = get_db()
    if db is None:
        return db_error()
    cursor = db.cursor(dictionary=True)
    cursor.execute("""
        SELECT a.artist_name, COUNT(*) AS plays
        FROM listening_history lh
        JOIN songs   s ON lh.song_id  = s.song_id
        JOIN artists a ON s.artist_id = a.artist_id
        GROUP BY a.artist_name
        ORDER BY plays DESC
        LIMIT 1
    """)
    result = cursor.fetchone()
    cursor.close()
    db.close()
    return jsonify(result if result else {})


# ─── API: FAVOURITE ALBUM ────────────────────────────────────────────────────
@app.route("/api/fav-album")
def fav_album():
    db = get_db()
    if db is None:
        return db_error()
    cursor = db.cursor(dictionary=True)
    cursor.execute("""
        SELECT al.album_name, COUNT(*) AS plays
        FROM listening_history lh
        JOIN songs  s  ON lh.song_id = s.song_id
        JOIN albums al ON s.album_id = al.album_id
        GROUP BY al.album_name
        ORDER BY plays DESC
        LIMIT 1
    """)
    result = cursor.fetchone()
    cursor.close()
    db.close()
    return jsonify(result if result else {})


# ─── API: TOP GENRES ─────────────────────────────────────────────────────────
@app.route("/api/top-genres")
def top_genres():
    db = get_db()
    if db is None:
        return db_error()
    cursor = db.cursor(dictionary=True)
    cursor.execute("""
        SELECT g.genre_name, COUNT(*) AS plays
        FROM listening_history lh
        JOIN song_genre sg ON lh.song_id  = sg.song_id
        JOIN genres     g  ON sg.genre_id = g.genre_id
        GROUP BY g.genre_name
        ORDER BY plays DESC
    """)
    result = cursor.fetchall()
    cursor.close()
    db.close()
    return jsonify(result)


# ─── API: SONGS PER GENRE ────────────────────────────────────────────────────
@app.route("/api/songs-per-genre")
def songs_per_genre():
    db = get_db()
    if db is None:
        return db_error()
    cursor = db.cursor(dictionary=True)
    cursor.execute("""
        SELECT g.genre_name, COUNT(sg.song_id) AS total_songs
        FROM genres g
        LEFT JOIN song_genre sg ON g.genre_id = sg.genre_id
        GROUP BY g.genre_name
    """)
    result = cursor.fetchall()
    cursor.close()
    db.close()
    return jsonify(result)


# ─── RUN ─────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    app.run(debug=True)


# ─── API: ADD USER ────────────────────────────────────────────────────────────
from flask import request

@app.route("/api/users/add", methods=["POST"])
def add_user():
    db = get_db()
    if db is None:
        return db_error()
    body    = request.get_json(force=True)
    name    = (body.get("name")    or "").strip()
    email   = (body.get("email")   or "").strip()
    country = (body.get("country") or "").strip()
    if not name or not email or not country:
        return jsonify({"error": "name, email and country are required"}), 400
    try:
        cursor = db.cursor()
        cursor.execute(
            "INSERT INTO users (name, email, country, join_date) VALUES (%s,%s,%s,CURDATE())",
            (name, email, country)
        )
        db.commit()
        new_id = cursor.lastrowid
        cursor.close(); db.close()
        return jsonify({"success": True, "user_id": new_id}), 201
    except Exception as e:
        db.close()
        if "Duplicate entry" in str(e):
            return jsonify({"error": "Email already exists"}), 409
        return jsonify({"error": str(e)}), 500
