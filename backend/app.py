import os
import sys
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import httpx

sys.path.append(str(Path(__file__).resolve().parent.parent))
from database.db import get_connection, init_db

app = FastAPI(title="AI Gym & Fitness Assistant Backend")
init_db()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class WorkoutRequest(BaseModel):
    exercise: str
    reps: int
    form_score: int
    duration_minutes: int
    heart_rate: int


class DietRequest(BaseModel):
    goal: str
    bmi: float
    weight_kg: float
    height_cm: float
    preferences: List[str]
    activity_level: str


class HabitRequest(BaseModel):
    streak_days: int
    sleep_hours: float
    mood: str
    workout_completed: bool


class ChatRequest(BaseModel):
    user_message: str


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    goal: str = "fat_loss"
    weight_kg: float | None = None
    height_cm: float | None = None


class ProfileUpdateRequest(BaseModel):
    name: str
    email: str
    goal: str
    weight_kg: float | None = None
    height_cm: float | None = None
    password: str | None = None


class IoTTelemetryRequest(BaseModel):
    device_id: str
    heart_rate: int | None = None
    steps: int | None = None
    calories_burned: int | None = None
    temperature_c: float | None = None
    battery_level: float | None = None
    status: str = "online"


OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")


@app.get("/health")
def health():
    return {"status": "ok", "service": "AI Gym & Fitness Assistant"}


@app.post("/api/auth/register")
def register(payload: RegisterRequest):
    conn = get_connection()
    existing = conn.execute("SELECT id FROM users WHERE email = ?", (payload.email,)).fetchone()
    if existing:
        conn.close()
        raise HTTPException(status_code=409, detail="User already exists")
    bmi_value = None
    if payload.weight_kg and payload.height_cm:
        bmi_value = round(payload.weight_kg / ((payload.height_cm / 100) ** 2), 1)
    conn.execute(
        "INSERT INTO users (name, email, goal, password, weight_kg, height_cm, bmi) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (payload.name, payload.email, payload.goal, payload.password, payload.weight_kg, payload.height_cm, bmi_value),
    )
    conn.commit()
    row = conn.execute(
        "SELECT id, name, email, goal, bmi, weight_kg, height_cm FROM users WHERE email = ?",
        (payload.email,),
    ).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=500, detail="Unable to create account")
    return {
        "id": row["id"],
        "name": row["name"],
        "email": row["email"],
        "goal": row["goal"],
        "bmi": row["bmi"],
        "weight_kg": row["weight_kg"],
        "height_cm": row["height_cm"],
    }


@app.post("/api/auth/login")
def login(payload: LoginRequest):
    conn = get_connection()
    row = conn.execute(
        "SELECT id, name, email, goal, bmi, weight_kg, height_cm FROM users WHERE email = ? AND password = ?",
        (payload.email, payload.password),
    ).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {
        "id": row["id"],
        "name": row["name"],
        "email": row["email"],
        "goal": row["goal"],
        "bmi": row["bmi"],
        "weight_kg": row["weight_kg"],
        "height_cm": row["height_cm"],
    }


@app.post("/api/profile/update")
def update_profile(payload: ProfileUpdateRequest):
    conn = get_connection()
    bmi_value = None
    if payload.weight_kg and payload.height_cm:
        bmi_value = round(payload.weight_kg / ((payload.height_cm / 100) ** 2), 1)
    conn.execute(
        "INSERT INTO users (name, email, goal, password, weight_kg, height_cm, bmi) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(email) DO UPDATE SET name=excluded.name, goal=excluded.goal, password=excluded.password, weight_kg=excluded.weight_kg, height_cm=excluded.height_cm, bmi=excluded.bmi",
        (payload.name, payload.email, payload.goal, payload.password or "", payload.weight_kg, payload.height_cm, bmi_value),
    )
    conn.commit()
    row = conn.execute(
        "SELECT id, name, email, goal, bmi, weight_kg, height_cm FROM users WHERE email = ?",
        (payload.email,),
    ).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=500, detail="Unable to save profile")
    return {
        "id": row["id"],
        "name": row["name"],
        "email": row["email"],
        "goal": row["goal"],
        "bmi": row["bmi"],
        "weight_kg": row["weight_kg"],
        "height_cm": row["height_cm"],
    }


@app.post("/api/workout/analyze")
def analyze_workout(payload: WorkoutRequest):
    performance = min(100, max(0, payload.form_score + payload.reps * 1.4 - max(0, payload.heart_rate - 140) * 0.4))
    feedback = "Excellent form and control." if performance >= 85 else "Focus on tempo and posture consistency."

    conn = get_connection()
    user_id = 1
    conn.execute(
        "INSERT INTO users (id, name, email, goal, bmi, weight_kg, height_cm) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING",
        (user_id, "Guest", "guest@example.com", "fitness", None, None, None),
    )
    conn.execute(
        "INSERT INTO workouts (user_id, exercise, reps, form_score, duration_minutes, heart_rate, performance_score, feedback) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (user_id, payload.exercise, payload.reps, payload.form_score, payload.duration_minutes, payload.heart_rate, round(performance, 1), feedback),
    )
    conn.commit()
    conn.close()

    return {
        "exercise": payload.exercise,
        "performance_score": round(performance, 1),
        "feedback": feedback,
        "recommendation": "Add a short cooldown and stay hydrated.",
    }


@app.post("/api/diet/recommend")
def recommend_diet(payload: DietRequest):
    if payload.goal == "fat_loss":
        calories = max(1800, int(2200 - (payload.bmi - 20) * 35 - payload.weight_kg * 0.2))
    elif payload.goal == "muscle_gain":
        calories = int(2500 + payload.weight_kg * 9)
    else:
        calories = int(2200 + payload.weight_kg * 2)

    meal_plan = [
        {"meal": "Breakfast", "item": "Greek yogurt bowl with berries and oats"},
        {"meal": "Lunch", "item": "Chicken quinoa bowl with greens"},
        {"meal": "Dinner", "item": "Salmon with brown rice and vegetables"},
    ]

    conn = get_connection()
    user_id = 1
    conn.execute(
        "INSERT INTO users (id, name, email, goal, bmi, weight_kg, height_cm) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING",
        (user_id, "Guest", "guest@example.com", payload.goal, payload.bmi, payload.weight_kg, payload.height_cm),
    )
    conn.execute(
        "INSERT INTO diet_logs (user_id, goal, calories_target, meal_plan) VALUES (?, ?, ?, ?)",
        (user_id, payload.goal, calories, str(meal_plan)),
    )
    conn.commit()
    conn.close()

    return {
        "goal": payload.goal,
        "calories_target": calories,
        "meal_plan": meal_plan,
        "notes": "Protein-rich meals and hydration are recommended.",
    }


@app.post("/api/habit/predict")
def predict_habit(payload: HabitRequest):
    risk = 20
    if payload.streak_days < 3:
        risk += 35
    if payload.sleep_hours < 6:
        risk += 20
    if payload.mood == "low":
        risk += 20
    if payload.workout_completed:
        risk -= 15

    risk = max(0, min(100, risk))
    nudge = "A short walk today will keep momentum high." if risk > 50 else "You are on track—keep the routine light and steady."
    conn = get_connection()
    user_id = 1
    conn.execute(
        "INSERT INTO users (id, name, email, goal, bmi, weight_kg, height_cm) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING",
        (user_id, "Guest", "guest@example.com", "fitness", None, None, None),
    )
    conn.execute(
        "INSERT INTO habit_logs (user_id, streak_days, sleep_hours, mood, workout_completed, skip_risk_percent, nudge) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (user_id, payload.streak_days, payload.sleep_hours, payload.mood, 1 if payload.workout_completed else 0, risk, nudge),
    )
    conn.commit()
    conn.close()

    return {
        "skip_risk_percent": risk,
        "nudge": nudge,
        "recommended_action": "Schedule a 15-minute mobility session.",
    }


@app.post("/api/iot/telemetry")
def receive_iot_telemetry(payload: IoTTelemetryRequest):
    conn = get_connection()
    conn.execute(
        "INSERT INTO device_telemetry (device_id, heart_rate, steps, calories_burned, temperature_c, battery_level, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (
            payload.device_id,
            payload.heart_rate,
            payload.steps,
            payload.calories_burned,
            payload.temperature_c,
            payload.battery_level,
            payload.status,
        ),
    )
    conn.commit()
    conn.close()
    return {
        "status": "received",
        "device_id": payload.device_id,
        "heart_rate": payload.heart_rate,
        "steps": payload.steps,
        "calories_burned": payload.calories_burned,
        "temperature_c": payload.temperature_c,
        "battery_level": payload.battery_level,
        "status": payload.status,
    }


@app.get("/api/iot/latest")
def get_latest_iot_telemetry():
    conn = get_connection()
    row = conn.execute(
        "SELECT device_id, heart_rate, steps, calories_burned, temperature_c, battery_level, status, received_at FROM device_telemetry ORDER BY id DESC LIMIT 1"
    ).fetchone()
    conn.close()
    if not row:
        return {"status": "idle", "device_id": None}
    return {
        "device_id": row["device_id"],
        "heart_rate": row["heart_rate"],
        "steps": row["steps"],
        "calories_burned": row["calories_burned"],
        "temperature_c": row["temperature_c"],
        "battery_level": row["battery_level"],
        "status": row["status"],
        "received_at": row["received_at"],
    }


@app.post("/api/chat")
async def chat_with_assistant(payload: ChatRequest):
    if not payload.user_message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {OPENAI_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "gpt-4o-mini",
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are a supportive AI fitness coach. Give concise advice for workout, diet, motivation, and habit building.",
                        },
                        {"role": "user", "content": payload.user_message},
                    ],
                    "temperature": 0.7,
                },
            )
            response.raise_for_status()
            data = response.json()
            reply = data["choices"][0]["message"]["content"].strip()
            conn = get_connection()
            conn.execute(
                "INSERT INTO users (id, name, email, goal, bmi, weight_kg, height_cm) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING",
                (1, "Guest", "guest@example.com", "fitness", None, None, None),
            )
            conn.execute(
                "INSERT INTO chat_messages (user_id, role, content) VALUES (?, ?, ?)",
                (1, "user", payload.user_message),
            )
            conn.execute(
                "INSERT INTO chat_messages (user_id, role, content) VALUES (?, ?, ?)",
                (1, "assistant", reply),
            )
            conn.commit()
            conn.close()
            return {"reply": reply}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"AI request failed: {str(exc)}") from exc
